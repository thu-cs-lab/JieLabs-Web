use crate::common::err;
use crate::env::ENV;
use crate::models::*;
use crate::schema::users::dsl;
use crate::DbConnection;
use crate::DbPool;
use actix_session::Session;
use actix_web::{delete, get, post, web, HttpResponse, Result};
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, PooledConnection};
use log::*;
use ring::{digest, hmac, rand};
use serde_derive::{Deserialize, Serialize};

pub fn hash_password(password: &str) -> String {
    // TODO: reuse hmac key for performance
    let secret = ENV.password_secret.clone();
    let secret = digest::digest(&digest::SHA512, secret.as_bytes());
    let key = hmac::Key::new(hmac::HMAC_SHA512, secret.as_ref());
    let mut ctx = hmac::Context::with_key(&key);
    ctx.update(password.as_bytes());
    let sign = ctx.sign();
    format!("{:x?}", sign.as_ref())
}

pub async fn get_user(
    sess: &Session,
    conn: PooledConnection<ConnectionManager<DbConnection>>,
) -> Result<
    (
        Option<User>,
        PooledConnection<ConnectionManager<DbConnection>>,
    ),
    actix_web::Error,
> {
    if let Some(name) = sess.get::<String>("login")? {
        let (user, conn) = web::block(move || {
            match dsl::users
                .filter(dsl::user_name.eq(name))
                .first::<User>(&conn)
            {
                Ok(res) => Ok((res, conn)),
                Err(err) => Err(err),
            }
        })
        .await
        .map_err(err)?;
        return Ok((Some(user), conn));
    }
    Ok((None, conn))
}

#[derive(Deserialize)]
struct LoginRequest {
    user_name: String,
    password: String,
}

#[derive(Serialize, Default)]
struct UserInfoResponse {
    login: bool,
    user_name: Option<String>,
    real_name: Option<String>,
    class: Option<String>,
    student_id: Option<String>,
    last_login: Option<DateTime<Utc>>,
}

#[post("/session")]
async fn login(
    sess: Session,
    pool: web::Data<DbPool>,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    let hashed = hash_password(&body.password);
    if let Ok(mut user) = dsl::users
        .filter(
            dsl::user_name
                .eq(&body.user_name)
                .and(dsl::password.eq(&hashed)),
        )
        .first::<User>(&conn)
    {
        info!("User {} logged in", user.user_name);
        let orig_last_login = user.last_login;
        user.last_login = Some(Utc::now());
        diesel::update(&user)
            .set(&user)
            .execute(&conn)
            .map_err(err)?;
        sess.set("login", user.user_name.clone())?;
        Ok(HttpResponse::Ok().json(UserInfoResponse {
            login: true,
            user_name: Some(user.user_name),
            real_name: user.real_name,
            class: user.class,
            student_id: user.student_id,
            // return null on first login
            last_login: orig_last_login,
        }))
    } else {
        Ok(HttpResponse::Ok().json(UserInfoResponse::default()))
    }
}

#[get("/session")]
async fn info(sess: Session, pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), _conn) = get_user(&sess, conn).await? {
        return Ok(HttpResponse::Ok().json(UserInfoResponse {
            login: true,
            user_name: Some(user.user_name),
            real_name: user.real_name,
            class: user.class,
            student_id: user.student_id,
            last_login: user.last_login,
        }));
    }
    Ok(HttpResponse::Ok().json(UserInfoResponse::default()))
}

#[delete("/session")]
async fn logout(sess: Session) -> Result<HttpResponse> {
    if let Some(user) = sess.get::<String>("login")? {
        info!("User {} logged out", user);
    }
    sess.remove("login");
    Ok(HttpResponse::Ok().json(true))
}

#[get("/portal/auth")]
async fn portal_fwd(sess: Session, rng: web::Data<rand::SystemRandom>) -> Result<HttpResponse> {
    // Generate state
    let rnd: [u8; 32] = rand::generate(rng.as_ref()).map_err(err)?.expose();
    let state = hex::encode(&rnd);
    sess.set("state", &state)?;

    let cb = format!("{}/api/portal/callback", ENV.base);
    let endpoint = format!("{}/api/authorize", ENV.portal);

    let url = url::Url::parse_with_params(
        &endpoint,
        &[
            ("state", state.as_str()),
            ("redirect_uri", cb.as_str()),
            ("scope", "read"),
            ("client_id", ENV.portal_client_id.as_str()),
            ("response_type", "code"),
        ],
    )
    .map_err(err)?;

    Ok(HttpResponse::Found()
        .header(actix_web::http::header::LOCATION, url.as_str())
        .finish())
}

#[derive(Deserialize)]
#[serde(untagged)]
enum CallbackData {
    Error {
        error: String,
        error_description: String,
    },
    Success {
        state: String,
        code: String,
    },
}

#[derive(Deserialize)]
struct TokenData {
    access_token: String,
    // refresh_token: String,
    // expires_in: usize,
    // scope: String,
    // token_type: String, // Asserts to Bearer
}

#[derive(Deserialize)]
struct PortalUser {
    user_name: String,
    real_name: String,

    // Dont care about last_login
    student_id: Option<String>,
    department: Option<String>,
}

#[get("/portal/callback")]
async fn portal_cb(
    sess: Session,
    data: web::Query<CallbackData>,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse> {
    // TODO: state timeout
    match data.into_inner() {
        CallbackData::Success { state, code } => {
            let stored_state = sess.get::<String>("state")?;
            if stored_state != Some(state) {
                return Ok(HttpResponse::BadRequest().finish());
            }

            let cb = format!("{}/api/portal/callback", ENV.base);
            let endpoint = format!("{}/api/token", ENV.portal);

            let token_url = url::Url::parse_with_params(
                &endpoint,
                &[
                    ("redirect_uri", cb.as_str()),
                    ("scope", "read"),
                    ("client_id", ENV.portal_client_id.as_str()),
                    ("client_secret", ENV.portal_client_secret.as_str()),
                    ("grant_type", "authorization_code"),
                    ("code", code.as_str()),
                ],
            )
            .map_err(err)?;

            let cli = reqwest::Client::new();
            let token_resp = cli.get(token_url).send().await.map_err(err)?;
            let token_data: TokenData = token_resp.json().await.map_err(err)?;

            let user_endpoint = format!("{}/api/self", ENV.portal);
            let user_resp = cli
                .get(&user_endpoint)
                .bearer_auth(token_data.access_token)
                .send()
                .await
                .map_err(err)?;
            let user_data: PortalUser = user_resp.json().await.map_err(err)?;

            let now = Utc::now();

            let new_user = NewUser {
                user_name: user_data.user_name.clone(),
                password: None,
                real_name: Some(user_data.real_name),
                student_id: user_data.student_id,
                class: user_data.department,
                role: String::from("user"),
                last_login: Some(now),
            };

            let conn = pool.get().map_err(err)?;

            diesel::insert_into(crate::schema::users::table)
                .values(&new_user)
                .on_conflict(dsl::user_name)
                .do_update()
                .set(dsl::last_login.eq(Some(now)))
                .execute(&conn)
                .map_err(err)?;

            sess.set("login", user_data.user_name)?;
            Ok(HttpResponse::Ok().finish()) // TODO: postMessage
        }
        CallbackData::Error {
            error,
            error_description,
        } => Ok(HttpResponse::BadRequest().body(format!("{}: {}", error, error_description))),
    }
}
