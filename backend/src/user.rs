use crate::models::*;
use crate::schema::users::dsl;
use crate::session::{get_user, hash_password};
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{get, post, delete, web, HttpResponse, Responder};
use diesel::prelude::*;
use serde_derive::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct UserListRequest {
    offset: Option<i64>,
    limit: Option<i64>,
}

#[derive(Serialize, Deserialize)]
struct UserListResponse {
    offset: i64,
    limit: i64,
    users: Vec<UserInfo>,
}

#[derive(Serialize, Deserialize)]
struct UserInfo {
    user_name: String,
    real_name: Option<String>,
    class: Option<String>,
    student_id: Option<String>,
    role: String,
}

#[get("/list")]
async fn list(
    id: Identity,
    pool: web::Data<DbPool>,
    query: web::Query<UserListRequest>,
) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(user) = get_user(&id, &conn) {
        if user.role == "admin" {
            let offset = query.offset.unwrap_or(0);
            let limit = query.offset.unwrap_or(5);
            if let Ok(users) = dsl::users.offset(offset).limit(limit).load::<User>(&conn) {
                let mut res = vec![];
                for user in users {
                    res.push(UserInfo {
                        user_name: user.user_name,
                        real_name: user.real_name,
                        class: user.class,
                        student_id: user.student_id,
                        role: user.role,
                    });
                }
                return HttpResponse::Ok().json(UserListResponse {
                    offset,
                    limit,
                    users: res,
                });
            }
        }
    }
    HttpResponse::Forbidden().finish()
}

#[derive(Serialize, Deserialize)]
struct UserUpdateRequest {
    real_name: Option<String>,
    class: Option<String>,
    student_id: Option<String>,
    role: Option<String>,
    password: Option<String>,
}

#[post("/manage/{name}")]
async fn update(
    id: Identity,
    pool: web::Data<DbPool>,
    path: web::Path<String>,
    body: web::Json<UserUpdateRequest>,
) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(user) = get_user(&id, &conn) {
        if user.role == "admin" {
            if let Ok(mut user) = dsl::users
                .filter(dsl::user_name.eq(&*path))
                .first::<User>(&conn)
            {
                if let Some(real_name) = &body.real_name {
                    user.real_name = Some(real_name.clone());
                }
                if let Some(class) = &body.class {
                    user.class = Some(class.clone());
                }
                if let Some(student_id) = &body.student_id {
                    user.student_id = Some(student_id.clone());
                }
                if let Some(role) = &body.role {
                    user.role = role.clone();
                }
                if let Some(password) = &body.password {
                    user.password = hash_password(password);
                }
                return HttpResponse::Ok()
                    .json(diesel::update(&user).set(&user).execute(&conn).is_ok());
            }
        }
    }
    HttpResponse::Forbidden().finish()
}

#[get("/manage/{name}")]
async fn get(id: Identity, pool: web::Data<DbPool>, path: web::Path<String>) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(user) = get_user(&id, &conn) {
        if user.role == "admin" {
            if let Ok(user) = dsl::users
                .filter(dsl::user_name.eq(&*path))
                .first::<User>(&conn)
            {
                return HttpResponse::Ok().json(UserInfo {
                    user_name: user.user_name,
                    real_name: user.real_name,
                    class: user.class,
                    student_id: user.student_id,
                    role: user.role,
                });
            } else {
                return HttpResponse::Ok().json(false);
            }
        }
    }
    HttpResponse::Forbidden().finish()
}

#[delete("/manage/{name}")]
async fn remove(id: Identity, pool: web::Data<DbPool>, path: web::Path<String>) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(user) = get_user(&id, &conn) {
        if user.role == "admin" {
            if let Ok(user) = dsl::users
                .filter(dsl::user_name.eq(&*path))
                .first::<User>(&conn)
            {
                return HttpResponse::Ok().json(diesel::delete(&user).execute(&conn).is_ok());
            } else {
                return HttpResponse::Ok().json(false);
            }
        }
    }
    HttpResponse::Forbidden().finish()
}