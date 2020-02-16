use crate::board_manager::{get_board_manager, GetBoardList};
use crate::common::err;
use crate::session::get_user;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{get, post, web, HttpResponse, Result};

#[get("/list")]
async fn list(id: Identity, pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let Some(user) = get_user(&id, &conn) {
        if user.role == "admin" {
            let man = get_board_manager();
            if let Ok(res) = man.send(GetBoardList).await {
                return Ok(HttpResponse::Ok().json(res.0));
            }
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[post("/version")]
async fn get_version(id: Identity, pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let Some(user) = get_user(&id, &conn) {
        if user.role == "admin" {
            return Ok(HttpResponse::Ok().json(true));
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[get("/version")]
async fn update_version(pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    Ok(HttpResponse::Forbidden().finish())
}
