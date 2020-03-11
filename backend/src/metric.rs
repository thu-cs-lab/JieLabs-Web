use crate::board_manager::{get_board_manager, BoardInfoList, GetBoardList};
use crate::common::err;
use crate::env::ENV;
use crate::schema::{jobs, users};
use crate::task_manager::{get_task_manager, GetMetric, GetMetricResponse};
use crate::ws_user::ONLINE_USERS;
use crate::DbPool;
use actix_web::{get, web, Result};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use diesel::prelude::*;
use std::sync::atomic::Ordering;
use std::time::SystemTime;

#[get("/")]
async fn get(pool: web::Data<DbPool>, auth: BearerAuth) -> Result<String> {
    if auth.token() == ENV.metric_auth {
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let conn = pool.get().map_err(err)?;
        let user_count = users::dsl::users
            .count()
            .get_result::<i64>(&conn)
            .map_err(err)?;
        let job_count = jobs::dsl::jobs
            .count()
            .get_result::<i64>(&conn)
            .map_err(err)?;
        let job_compilation_success_count = jobs::dsl::jobs
            .filter(jobs::dsl::status.eq("Compilation Success"))
            .count()
            .get_result::<i64>(&conn)
            .map_err(err)?;
        let job_compilation_failed_count = jobs::dsl::jobs
            .filter(jobs::dsl::status.eq("Compilation Failed"))
            .count()
            .get_result::<i64>(&conn)
            .map_err(err)?;
        let job_system_error_count = jobs::dsl::jobs
            .filter(jobs::dsl::status.eq("System Error"))
            .count()
            .get_result::<i64>(&conn)
            .map_err(err)?;
        let tasks: GetMetricResponse = get_task_manager().send(GetMetric).await?;
        let boards: BoardInfoList = get_board_manager().send(GetBoardList).await?;
        let board_count = boards.0.len();
        let assigned_board_count = boards
            .0
            .iter()
            .filter(|board| board.connected_user.is_some())
            .count();
        Ok(format!(
            "jielabsweb-backend user-count={}i,online-user-count={}i,job-count={}i,job-compilation-success-count={}i,job-compilation-failed-count={}i,job-system-error-count={}i,waiting-len={}i,working-len={}i,board-count={}i,assigned-board-count={}i {}",
            user_count, ONLINE_USERS.load(Ordering::SeqCst), job_count, job_compilation_success_count, job_compilation_failed_count, job_system_error_count, tasks.len_waiting, tasks.len_working, board_count, assigned_board_count, timestamp
        ))
    } else {
        Ok(format!(""))
    }
}
