use crate::session::get_user;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{post, web, HttpResponse, Responder};
use serde_derive::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
struct BuildRequest {
    source: String,
}

#[post("/build")]
async fn build(id: Identity, body: web::Json<BuildRequest>, pool: web::Data<DbPool>) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(_user) = get_user(&id, &conn) {
        return HttpResponse::Ok().json(true);
    }
    HttpResponse::Forbidden().finish()
}
