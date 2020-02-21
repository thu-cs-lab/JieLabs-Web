use crate::common::err;
use crate::models::*;
use crate::schema::users::dsl;
use crate::DbConnection;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{delete, get, post, web, HttpResponse, Responder, Result};
use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, PooledConnection};
use log::*;
use ring::{digest, hmac};
use serde_derive::{Deserialize, Serialize};

pub fn hash_password(password: &str) -> String {
    // TODO: reuse hmac key for performance
    let secret = std::env::var("PASSWORD_SECRET").unwrap_or(String::new());
    let secret = digest::digest(&digest::SHA512, secret.as_bytes());
    let key = hmac::Key::new(hmac::HMAC_SHA512, secret.as_ref());
    let mut ctx = hmac::Context::with_key(&key);
    ctx.update(password.as_bytes());
    let sign = ctx.sign();
    format!("{:x?}", sign.as_ref())
}

pub async fn get_user(
    id: &Identity,
    conn: PooledConnection<ConnectionManager<DbConnection>>,
) -> Result<
    (
        Option<User>,
        PooledConnection<ConnectionManager<DbConnection>>,
    ),
    actix_web::Error,
> {
    if let Some(name) = id.identity() {
        let (user, conn) = web::block(move || {
            match dsl::users
                .filter(dsl::user_name.eq(&name))
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
}

#[post("/session")]
async fn login(
    id: Identity,
    pool: web::Data<DbPool>,
    body: web::Json<LoginRequest>,
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    let hashed = hash_password(&body.password);
    if let Ok(user) = dsl::users
        .filter(
            dsl::user_name
                .eq(&body.user_name)
                .and(dsl::password.eq(&hashed)),
        )
        .first::<User>(&conn)
    {
        info!("User {} logged in", user.user_name);
        id.remember(user.user_name.clone());
        Ok(HttpResponse::Ok().json(UserInfoResponse {
            login: true,
            user_name: Some(user.user_name),
            real_name: user.real_name,
            class: user.class,
            student_id: user.student_id,
        }))
    } else {
        Ok(HttpResponse::Ok().json(UserInfoResponse::default()))
    }
}

#[get("/session")]
async fn info(id: Identity, pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), _conn) = get_user(&id, conn).await? {
        return Ok(HttpResponse::Ok().json(UserInfoResponse {
            login: true,
            user_name: Some(user.user_name),
            real_name: user.real_name,
            class: user.class,
            student_id: user.student_id,
        }));
    }
    Ok(HttpResponse::Ok().json(UserInfoResponse::default()))
}

#[delete("/session")]
async fn logout(id: Identity) -> impl Responder {
    if let Some(user) = id.identity() {
        info!("User {} logged out", user);
    }
    id.forget();
    HttpResponse::Ok().json(true)
}
