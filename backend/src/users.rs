use log::*;
use crate::models::*;
use crate::schema::users::dsl;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{get, post, web, HttpResponse, Responder};
use diesel::prelude::*;
use serde_derive::{Deserialize, Serialize};
use ring::{digest, hmac};

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

#[derive(Deserialize)]
struct LoginRequest {
    user_name: String,
    password: String,
}

#[derive(Serialize)]
struct UserInfoResponse {
    user_name: String,
    real_name: Option<String>,
    class: Option<String>,
    student_id: Option<String>,
}

#[post("/login")]
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
        id.remember(user.user_name);
        HttpResponse::Found().header("location", "/").finish()
    } else {
        HttpResponse::Ok().json(false)
    }
}

#[get("/info")]
async fn info(id: Identity, pool: web::Data<DbPool>) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(name) = id.identity() {
        if let Ok(user) = dsl::users
            .filter(dsl::user_name.eq(&name))
            .first::<User>(&conn)
        {
            HttpResponse::Ok().json(UserInfoResponse {
                user_name: user.user_name,
                real_name: user.real_name,
                class: user.class,
                student_id: user.student_id,
            })
        } else {
            HttpResponse::Ok().json(false)
        }
    } else {
        HttpResponse::Found().header("location", "/").finish()
    }
}

#[get("/logout")]
async fn logout(id: Identity) -> impl Responder {
    id.forget();
    HttpResponse::Found().header("location", "/").finish()
}
