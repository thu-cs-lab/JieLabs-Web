use lazy_static::lazy_static;
use std::env::var;

pub struct Env {
    pub database_url: String,
    pub cookie_secret: String,
    pub password_secret: String,
    pub board_pass: String,
    pub metric_auth: String,
    pub allow_anonymous_ws_user: bool,
    // s3
    pub s3_endpoint: String,
    pub s3_bucket: String,
    pub s3_key: String,
    pub s3_secret: String,
    pub s3_region: String,
    // redis
    pub redis_url: String,
    pub redis_waiting_queue: String,
    pub redis_working_queue: String,
    // sentry
    pub sentry_url: Option<String>,
}

fn get_env() -> Env {
    Env {
        database_url: var("DATABASE_URL").expect("DATABASE_URL"),
        cookie_secret: var("COOKIE_SECRET").expect("COOKIE_SECRET"),
        password_secret: var("PASSWORD_SECRET").expect("PASSWORD_SECRET"),
        board_pass: var("BOARD_PASS").expect("BOARD_PASS"),
        metric_auth: var("METRIC_AUTH").expect("METRIC_AUTH"),
        allow_anonymous_ws_user: var("ALLOW_ANONYMOUS_WS_USER").is_ok(),
        s3_endpoint: var("S3_ENDPOINT").expect("S3_ENDPOINT"),
        s3_bucket: var("S3_BUCKET").expect("S3_BUCKET"),
        s3_key: var("S3_KEY").expect("S3_KEY"),
        s3_secret: var("S3_SECRET").expect("S3_SECRET"),
        s3_region: var("S3_REGION").expect("S3_REGION"),
        redis_url: var("REDIS_URL").expect("REDIS_URL"),
        redis_waiting_queue: var("REDIS_WAITING_QUEUE").expect("jielabs-waiting"),
        redis_working_queue: var("REDIS_WORKING_QUEUE").expect("jielabs-working"),
        sentry_url: var("SENTRY_URL").ok(),
    }
}

lazy_static! {
    pub static ref ENV: Env = get_env();
}
