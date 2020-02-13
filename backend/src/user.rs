use crate::models::*;
use crate::schema::users::dsl;
use crate::session::get_user;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{get, web, HttpResponse, Responder};
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
