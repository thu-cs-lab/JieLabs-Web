use crate::task_manager::{get_task_manager, GetMetric, GetMetricResponse};
use crate::DbPool;
use actix_web::{get, web, HttpResponse, Result};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use std::time::SystemTime;

#[get("/")]
async fn get(pool: web::Data<DbPool>, auth: BearerAuth) -> Result<String> {
    if auth.token() == std::env::var("METRIC_AUTH").expect("METRIC_AUTH") {
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let tasks: GetMetricResponse = get_task_manager().send(GetMetric).await?;
        Ok(format!(
            "jielabsweb-backend waiting-len={}i,working-len={}i {}",
            tasks.len_waiting, tasks.len_working, timestamp
        ))
    } else {
        Ok(format!(""))
    }
}
