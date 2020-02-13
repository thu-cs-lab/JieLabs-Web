use crate::session::get_user;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{get, web, HttpResponse, Responder};
use rusoto_core::credential::AwsCredentials;
use rusoto_core::Region;
use rusoto_s3::util::PreSignedRequest;
use rusoto_s3::{PutObjectRequest, S3Client};
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
        name: String::from("something"),
        endpoint: std::env::var("S3_ENDPOINT").expect("S3_ENDPOINT"),
    }
}

fn s3_client() -> S3Client {
    S3Client::new(s3_region())
}

#[get("/upload")]
async fn upload(id: Identity, pool: web::Data<DbPool>) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(_user) = get_user(&id, &conn) {
        let bucket = std::env::var("S3_BUCKET").expect("S3_BUCKET");
        let uuid = Uuid::new_v4();
        let filename = uuid
            .to_simple()
            .encode_lower(&mut Uuid::encode_buffer())
            .to_owned();
        let req = PutObjectRequest {
            bucket,
            key: filename.clone(),
            ..Default::default()
        };
        let presigned_url =
            req.get_presigned_url(&s3_region(), &s3_credentials(), &Default::default());
        return HttpResponse::Ok().json(UploadResponse {
            uuid: filename,
            url: presigned_url,
        });
    }
    HttpResponse::Forbidden().finish()
}
