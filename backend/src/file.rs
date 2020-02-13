use crate::session::get_user;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{get, web, HttpResponse, Responder};
use rusoto_core::credential::AwsCredentials;
use rusoto_core::Region;
use rusoto_s3::util::PreSignedRequest;
use rusoto_s3::{GetObjectRequest, PutObjectRequest};
use serde_derive::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
struct UploadResponse {
    uuid: String,
    url: String,
}

fn s3_credentials() -> AwsCredentials {
    AwsCredentials::new(
        std::env::var("S3_KEY").expect("S3_KEY"),
        std::env::var("S3_SECRET").expect("S3_SECRET"),
        None,
        None,
    )
}

fn s3_region() -> Region {
    Region::Custom {
        name: std::env::var("S3_REGION").expect("S3_REGION"),
        endpoint: std::env::var("S3_ENDPOINT").expect("S3_ENDPOINT"),
    }
}

pub fn generate_file_name() -> String {
    let uuid = Uuid::new_v4();
    let file_name = uuid
        .to_simple()
        .encode_lower(&mut Uuid::encode_buffer())
        .to_owned();
    file_name
}

pub fn get_upload_url(file_name: &String) -> String {
    let bucket = std::env::var("S3_BUCKET").expect("S3_BUCKET");
    let req = PutObjectRequest {
        bucket,
        key: file_name.clone(),
        ..Default::default()
    };
    let presigned_url = req.get_presigned_url(&s3_region(), &s3_credentials(), &Default::default());
    presigned_url
}

pub fn get_download_url(file_name: &String) -> String {
    let bucket = std::env::var("S3_BUCKET").expect("S3_BUCKET");
    let req = GetObjectRequest {
        bucket,
        key: file_name.clone(),
        ..Default::default()
    };
    let presigned_url = req.get_presigned_url(&s3_region(), &s3_credentials(), &Default::default());
    presigned_url
}

#[get("/upload")]
async fn upload(id: Identity, pool: web::Data<DbPool>) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(_user) = get_user(&id, &conn) {
        let file_name = generate_file_name();
        let presigned_url = get_upload_url(&file_name);
        return HttpResponse::Ok().json(UploadResponse {
            uuid: file_name,
            url: presigned_url,
        });
    }
    HttpResponse::Forbidden().finish()
}
