use crate::board_manager::{get_board_manager, GetBoardList};
use crate::session::get_user;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{get, web, HttpResponse, Responder};

#[get("/list")]
async fn list(id: Identity, pool: web::Data<DbPool>) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(user) = get_user(&id, &conn) {
        if user.role == "admin" {
            let man = get_board_manager();
            if let Ok(res) = man.send(GetBoardList).await {
                return HttpResponse::Ok().json(res.0);
            }
        }
    }
    HttpResponse::Forbidden().finish()
}
