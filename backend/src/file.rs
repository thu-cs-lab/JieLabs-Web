use crate::session::get_user;
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{get, web, HttpResponse, Responder};
use rusoto_core::credential::{AwsCredentials, DefaultCredentialsProvider, ProvideAwsCredentials};
use rusoto_core::Region;
use rusoto_s3::util::PreSignedRequest;
use rusoto_s3::{PutObjectRequest, S3Client};

async fn s3_credentials() -> AwsCredentials {
    AwsCredentials::new("minioadmin", "minioadmin", None, None)
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
        let bucket = String::from("jielabs-upload");
        let filename = String::from("file1");
        let req = PutObjectRequest {
            bucket,
            key: filename,
            ..Default::default()
        };
        let presigned_url =
            req.get_presigned_url(&s3_region(), &s3_credentials().await, &Default::default());
        return HttpResponse::Ok().json(presigned_url);
    }
    HttpResponse::Forbidden().finish()
}
