use actix_web::{error::ErrorInternalServerError, Error};
use log::*;
use rusoto_core::credential::AwsCredentials;
use rusoto_core::Region;
use rusoto_s3::util::PreSignedRequest;
use rusoto_s3::{GetObjectRequest, PutObjectRequest};
use serde_derive::{Deserialize, Serialize};
use std::fmt::Display;
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct IOSetting {
    pub mask: u64,
    pub data: u64,
}

pub fn get_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

pub fn generate_uuid() -> String {
    let uuid = Uuid::new_v4();
    uuid.to_simple()
        .encode_lower(&mut Uuid::encode_buffer())
        .to_owned()
}

pub fn s3_credentials() -> AwsCredentials {
    AwsCredentials::new(
        std::env::var("S3_KEY").expect("S3_KEY"),
        std::env::var("S3_SECRET").expect("S3_SECRET"),
        None,
        None,
    )
}

pub fn s3_region() -> Region {
    Region::Custom {
        name: std::env::var("S3_REGION").expect("S3_REGION"),
        endpoint: std::env::var("S3_ENDPOINT").expect("S3_ENDPOINT"),
    }
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

pub fn err<T: Display>(err: T) -> Error {
    let error_token = generate_uuid();
    warn!("Error {}: {}", error_token, err);
    ErrorInternalServerError(format!(
        "Please contact admin with error token {}",
        error_token
    ))
}
