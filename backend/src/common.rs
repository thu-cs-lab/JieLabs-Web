use crate::env::ENV;
use actix_web::{error::ErrorInternalServerError, Error};
use bytes::Bytes;
use futures::TryStreamExt;
use log::*;
use rusoto_core::credential::{AwsCredentials, StaticProvider};
use rusoto_core::Region;
use rusoto_s3::util::PreSignedRequest;
use rusoto_s3::S3;
use rusoto_s3::{GetObjectRequest, PutObjectRequest, S3Client};
use serde_derive::{Deserialize, Serialize};
use std::fmt::Display;
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct IOSetting {
    pub mask: Option<String>,
    pub data: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ClockSetting {
    pub frequency: u32,
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
    AwsCredentials::new(ENV.s3_key.clone(), ENV.s3_secret.clone(), None, None)
}

pub fn s3_client() -> S3Client {
    let client = S3Client::new_with(
        rusoto_core::request::HttpClient::new().expect("Failed to creat HTTP client"),
        StaticProvider::from(s3_credentials()),
        s3_region(),
    );
    client
}

pub fn s3_region() -> Region {
    Region::Custom {
        name: ENV.s3_region.clone(),
        endpoint: ENV.s3_endpoint.clone(),
    }
}

pub fn get_upload_url(file_name: &String) -> String {
    let bucket = ENV.s3_bucket.clone();
    let req = PutObjectRequest {
        bucket,
        key: file_name.clone(),
        ..Default::default()
    };
    let presigned_url = req.get_presigned_url(&s3_region(), &s3_credentials(), &Default::default());
    presigned_url
}

pub fn get_download_url(file_name: &String) -> String {
    let bucket = ENV.s3_bucket.clone();
    let req = GetObjectRequest {
        bucket,
        key: file_name.clone(),
        ..Default::default()
    };
    let presigned_url = req.get_presigned_url(&s3_region(), &s3_credentials(), &Default::default());
    presigned_url
}

pub async fn download_s3(file_name: String) -> Option<Bytes> {
    let bucket = ENV.s3_bucket.clone();
    let client = s3_client();
    let req = GetObjectRequest {
        bucket,
        key: file_name.clone(),
        ..Default::default()
    };
    if let Ok(result) = client.get_object(req).await {
        if let Some(stream) = result.body {
            if let Ok(body) = stream
                .map_ok(|b| bytes::BytesMut::from(&b[..]))
                .try_concat()
                .await
            {
                return Some(body.freeze());
            }
        }
    }
    None
}

pub fn err<T: Display>(err: T) -> Error {
    let error_token = generate_uuid();
    error!("Error {}: {}", error_token, err);
    ErrorInternalServerError(format!(
        "Please contact admin with error token {}",
        error_token
    ))
}
