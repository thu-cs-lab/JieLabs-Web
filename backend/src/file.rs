use crate::common::{err, generate_uuid, get_upload_url};
use crate::session::get_user;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{get, web, HttpResponse, Result};
use serde_derive::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct UploadResponse {
    uuid: String,
    url: String,
}

#[get("/upload")]
async fn upload(id: Identity, pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let Some(_user) = get_user(&id, &conn) {
        let file_name = generate_uuid();
        let presigned_url = get_upload_url(&file_name);
        return Ok(HttpResponse::Ok().json(UploadResponse {
            uuid: file_name,
            url: presigned_url,
        }));
    }
    Ok(HttpResponse::Forbidden().finish())
}
