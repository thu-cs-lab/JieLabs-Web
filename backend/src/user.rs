use crate::common::err;
use crate::models::*;
use crate::schema::users::dsl;
use crate::session::{get_user, hash_password};
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{delete, get, post, web, HttpResponse, Result};
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
    id: i32,
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
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), conn) = get_user(&id, conn).await? {
        if user.role == "admin" {
            let offset = query.offset.unwrap_or(0);
            let limit = query.limit.unwrap_or(5);
            let users = web::block(move || {
                if limit >= 0 {
                    dsl::users.offset(offset).limit(limit).load::<User>(&conn)
                } else {
                    dsl::users.offset(offset).load::<User>(&conn)
                }
            })
            .await
            .map_err(err)?;
            let mut res = vec![];
            for user in users {
                res.push(UserInfo {
                    id: user.id,
                    user_name: user.user_name,
                    real_name: user.real_name,
                    class: user.class,
                    student_id: user.student_id,
                    role: user.role,
                });
            }
            return Ok(HttpResponse::Ok().json(UserListResponse {
                offset,
                limit,
                users: res,
            }));
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[get("/count")]
async fn count(id: Identity, pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), conn) = get_user(&id, conn).await? {
        if user.role == "admin" {
            if let Ok(count) = dsl::users.count().get_result::<i64>(&conn) {
                return Ok(HttpResponse::Ok().json(count));
            }
        }
    }
    Ok(HttpResponse::Forbidden().finish())
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
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), conn) = get_user(&id, conn).await? {
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
                return Ok(HttpResponse::Ok()
                    .json(diesel::update(&user).set(&user).execute(&conn).is_ok()));
            }
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[get("/manage/{name}")]
async fn get(
    id: Identity,
    pool: web::Data<DbPool>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), conn) = get_user(&id, conn).await? {
        if user.role == "admin" {
            if let Ok(user) = dsl::users
                .filter(dsl::user_name.eq(&*path))
                .first::<User>(&conn)
            {
                return Ok(HttpResponse::Ok().json(UserInfo {
                    id: user.id,
                    user_name: user.user_name,
                    real_name: user.real_name,
                    class: user.class,
                    student_id: user.student_id,
                    role: user.role,
                }));
            } else {
                return Ok(HttpResponse::Ok().json(false));
            }
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[delete("/manage/{name}")]
async fn remove(
    id: Identity,
    pool: web::Data<DbPool>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), conn) = get_user(&id, conn).await? {
        if user.role == "admin" {
            if let Ok(user) = dsl::users
                .filter(dsl::user_name.eq(&*path))
                .first::<User>(&conn)
            {
                return Ok(HttpResponse::Ok().json(diesel::delete(&user).execute(&conn).is_ok()));
            } else {
                return Ok(HttpResponse::Ok().json(false));
            }
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}
