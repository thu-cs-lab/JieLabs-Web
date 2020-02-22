use actix::spawn;
use actix_web::{error::ErrorInternalServerError, Error};
use bytes::Bytes;
use futures::TryStreamExt;
use lazy_static::*;
use log::*;
use rusoto_core::credential::{AwsCredentials, StaticProvider};
use rusoto_core::Region;
use rusoto_s3::util::PreSignedRequest;
use rusoto_s3::S3;
use rusoto_s3::{
    CORSConfiguration, CORSRule, GetObjectRequest, PutBucketCorsRequest, PutObjectRequest, S3Client,
};
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
    AwsCredentials::new(
        std::env::var("S3_KEY").expect("S3_KEY"),
        std::env::var("S3_SECRET").expect("S3_SECRET"),
        None,
        None,
    )
}

lazy_static! {
    pub static ref S3_BUCKET: String = setup_s3_bucket();
}

pub fn s3_client() -> S3Client {
    let client = S3Client::new_with(
        rusoto_core::request::HttpClient::new().expect("Failed to creat HTTP client"),
        StaticProvider::from(s3_credentials()),
        s3_region(),
    );
    client
}

async fn setup_s3_cors(bucket: String) {
    let conf = CORSConfiguration {
        cors_rules: vec![CORSRule {
            allowed_methods: vec![String::from("GET"), String::from("PUT")],
            allowed_origins: vec![String::from("*")],
            ..Default::default()
        }],
    };
    let client = s3_client();
    let req = PutBucketCorsRequest {
        bucket: bucket,
        cors_configuration: conf,
        ..Default::default()
    };
    let result = client.put_bucket_cors(req).await;
    info!("setup s3 cors {:?}", result);
}

fn setup_s3_bucket() -> String {
    let bucket = std::env::var("S3_BUCKET").expect("S3_BUCKET");
    spawn(setup_s3_cors(bucket.clone()));
    bucket
}

pub fn s3_region() -> Region {
    Region::Custom {
        name: std::env::var("S3_REGION").expect("S3_REGION"),
        endpoint: std::env::var("S3_ENDPOINT").expect("S3_ENDPOINT"),
    }
}

pub fn get_upload_url(file_name: &String) -> String {
    let bucket = S3_BUCKET.clone();
    let req = PutObjectRequest {
        bucket,
        key: file_name.clone(),
        ..Default::default()
    };
    let presigned_url = req.get_presigned_url(&s3_region(), &s3_credentials(), &Default::default());
    presigned_url
}

pub fn get_download_url(file_name: &String) -> String {
    let bucket = S3_BUCKET.clone();
    let req = GetObjectRequest {
        bucket,
        key: file_name.clone(),
        ..Default::default()
    };
    let presigned_url = req.get_presigned_url(&s3_region(), &s3_credentials(), &Default::default());
    presigned_url
}

pub async fn download_s3(file_name: String) -> Option<Bytes> {
    let bucket = S3_BUCKET.clone();
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
