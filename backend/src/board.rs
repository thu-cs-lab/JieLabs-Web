use crate::board_manager::{get_board_manager, GetBoardList, SendToBoardByRemote};
use crate::common::err;
use crate::schema::configs;
use crate::session::get_user;
use crate::ws_board::WSBoardMessageS2B;
use crate::DbPool;
use actix_session::Session;
use actix_web::{get, post, web, HttpResponse, Result};
use diesel::prelude::*;
use serde_derive::{Deserialize, Serialize};

#[get("/list")]
async fn list(sess: Session, pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), _conn) = get_user(&sess, conn).await? {
        if user.role == "admin" {
            let man = get_board_manager();
            if let Ok(res) = man.send(GetBoardList).await {
                return Ok(HttpResponse::Ok().json(res.0));
            }
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[derive(Serialize, Deserialize)]
struct UpdateVersionRequest {
    version: String,
    url: String,
    hash: String,
}

#[post("/version")]
async fn update_version(
    sess: Session,
    pool: web::Data<DbPool>,
    body: web::Json<UpdateVersionRequest>,
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), conn) = get_user(&sess, conn).await? {
        if user.role == "admin" {
            let body = serde_json::to_string(&*body)?;
            web::block(move || {
                let kv = (
                    configs::dsl::key.eq("version"),
                    configs::dsl::value.eq(&body),
                );
                diesel::insert_into(configs::table)
                    .values(kv)
                    .on_conflict(configs::dsl::key)
                    .do_update()
                    .set(kv)
                    .execute(&conn)
            })
            .await
            .map_err(err)?;
            return Ok(HttpResponse::Ok().json(true));
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[get("/version")]
async fn get_version(pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    let config = web::block(move || {
        configs::dsl::configs
            .select(configs::dsl::value)
            .filter(configs::dsl::key.eq("version"))
            .first::<Option<String>>(&conn)
            .optional()
    })
    .await
    .map_err(err)?;
    if let Some(res) = config {
        if let Some(body) = res {
            let info: UpdateVersionRequest = serde_json::from_str(&body)?;
            let body = format!("{}\n{}\n{}\n", info.version, info.url, info.hash);
            return Ok(HttpResponse::Ok().body(&body));
        }
    } else {
        // unset
        return Ok(HttpResponse::Ok().body("\n\n\n"));
    }

    Ok(HttpResponse::Forbidden().finish())
}

#[derive(Serialize, Deserialize)]
struct ConfigBoardRequest {
    board: String,
    ident: bool,
}

#[post("/config")]
async fn config_board(
    sess: Session,
    pool: web::Data<DbPool>,
    body: web::Json<ConfigBoardRequest>,
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), _conn) = get_user(&sess, conn).await? {
        if user.role == "admin" {
            let res = get_board_manager()
                .send(SendToBoardByRemote {
                    remote: body.board.clone(),
                    action: WSBoardMessageS2B::Ident(body.ident),
                })
                .await
                .map_err(err)?;
            return Ok(HttpResponse::Ok().json(res));
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}
