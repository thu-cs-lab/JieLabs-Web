use crate::models::*;
use crate::schema::users::dsl;
use crate::DbConnection;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{delete, get, post, web, HttpResponse, Responder};
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

pub fn get_user(
    id: &Identity,
    conn: &PooledConnection<ConnectionManager<DbConnection>>,
) -> Option<User> {
    if let Some(name) = id.identity() {
        if let Ok(user) = dsl::users
            .filter(dsl::user_name.eq(&name))
            .first::<User>(conn)
        {
            return Some(user);
        }
    }
    None
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
) -> HttpResponse {
    let conn = pool.get().unwrap();
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
        HttpResponse::Ok().json(UserInfoResponse {
            login: true,
            user_name: Some(user.user_name),
            real_name: user.real_name,
            class: user.class,
            student_id: user.student_id,
        })
    } else {
        HttpResponse::Ok().json(UserInfoResponse::default())
    }
}

#[get("/session")]
async fn info(id: Identity, pool: web::Data<DbPool>) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(user) = get_user(&id, &conn) {
        return HttpResponse::Ok().json(UserInfoResponse {
            login: true,
            user_name: Some(user.user_name),
            real_name: user.real_name,
            class: user.class,
            student_id: user.student_id,
        });
    }
    HttpResponse::Ok().json(UserInfoResponse::default())
}

#[delete("/session")]
async fn logout(id: Identity) -> impl Responder {
    if let Some(user) = id.identity() {
        info!("User {} logged out", user);
    }
    id.forget();
    HttpResponse::Ok().json(true)
}
