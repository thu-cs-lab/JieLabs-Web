use crate::board_manager::{get_board_manager, BoardInfoList, GetBoardList};
use crate::common::err;
use crate::schema::{jobs, users};
use crate::task_manager::{get_task_manager, GetMetric, GetMetricResponse};
use crate::DbPool;
use actix_web::{get, web, Result};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use diesel::prelude::*;
use std::time::SystemTime;

#[get("/")]
async fn get(pool: web::Data<DbPool>, auth: BearerAuth) -> Result<String> {
    if auth.token() == std::env::var("METRIC_AUTH").expect("METRIC_AUTH") {
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let conn = pool.get().map_err(err)?;
        let user_count = users::dsl::users.count().execute(&conn).map_err(err)?;
        let job_count = jobs::dsl::jobs.count().execute(&conn).map_err(err)?;
        let tasks: GetMetricResponse = get_task_manager().send(GetMetric).await?;
        let boards: BoardInfoList = get_board_manager().send(GetBoardList).await?;
        let board_count = boards.0.len();
        let assigned_board_count = boards
            .0
            .iter()
            .filter(|board| board.connected_user.is_some())
            .count();
        Ok(format!(
            "jielabsweb-backend user-count={}i,job-count={}i,waiting-len={}i,working-len={}i,board-count={}i,assigned-board-count={}i {}",
            user_count, job_count, tasks.len_waiting, tasks.len_working, board_count, assigned_board_count, timestamp
        ))
    } else {
        Ok(format!(""))
    }
}
