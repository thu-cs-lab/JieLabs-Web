use crate::DbPool;
use actix_web::{get, web, HttpResponse, Result};
use actix_web_httpauth::extractors::bearer::BearerAuth;

#[get("/")]
async fn get(pool: web::Data<DbPool>, auth: BearerAuth) -> String {
    if auth.token() == std::env::var("METRIC_AUTH").expect("METRIC_AUTH") {
        format!("good")
    } else {
        format!("")
    }
}
