use crate::common::{generate_uuid, get_download_url, get_timestamp, get_upload_url};
use crate::env::ENV;
use crate::models::*;
use crate::schema::jobs;
use crate::DbPool;
use actix::prelude::*;
use diesel::prelude::*;
use log::*;
use redis;
use serde_derive::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Default)]
pub struct TaskManagerActor {
    client: Option<redis::Client>,
    conn: Option<redis::Connection>,
    db: Option<DbPool>,
}

impl actix::Supervised for TaskManagerActor {}

impl Actor for TaskManagerActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Context<Self>) {}
}

fn monitor(
    actor: &mut TaskManagerActor,
    ctx: &mut Context<TaskManagerActor>,
) -> Result<(), failure::Error> {
    if let Some(db) = &actor.db {
        if let Some(client) = &actor.client {
            let conn = if let Some(conn) = &mut actor.conn {
                conn
            } else {
                let conn = client.get_connection()?;
                actor.conn = Some(conn);
                actor.conn.as_mut().unwrap() // safe unwrap
            };
            let db_conn = db.get()?;
            let len_waiting: u64 = redis::cmd("LLEN")
                .arg(&ENV.redis_waiting_queue)
                .query(conn)?;
            let len_working: u64 = redis::cmd("LLEN")
                .arg(&ENV.redis_working_queue)
                .query(conn)?;
            if len_waiting > 0 || len_working > 0 {
                info!(
                    "task queue: {} waiting, {} working",
                    len_waiting, len_working
                );
                while let Some(last_working) = redis::cmd("LINDEX")
                    .arg(&ENV.redis_working_queue)
                    .arg("-1")
                    .query::<Option<String>>(conn)?
                {
                    if let Ok(task) = serde_json::from_str::<SubmitBuildTask>(&last_working) {
                        // find job by task
                        if let Ok(mut job) = jobs::dsl::jobs
                            .filter(jobs::dsl::task_id.eq(&task.id))
                            .first::<Job>(&db_conn)
                        {
                            if job.status.is_some() {
                                // done, remove it
                                redis::cmd("RPOP")
                                    .arg(&ENV.redis_working_queue)
                                    .query(conn)?;
                                info!("task queue: removing finished task {}", task.id,);
                            } else {
                                if get_timestamp() - task.timestamp > 5 * 60 {
                                    // timeout, assign a new task id and destination
                                    let new_task_id = generate_uuid();
                                    let new_dest = generate_uuid();
                                    job.task_id = Some(new_task_id.clone());
                                    job.destination = Some(new_dest.clone());
                                    let src_url = get_download_url(&job.source);
                                    let dst_url = get_upload_url(&new_dest);
                                    diesel::update(&job).set(&job).execute(&db_conn)?;
                                    ctx.address().do_send(SubmitBuildTask {
                                        id: new_task_id.clone(),
                                        src: src_url,
                                        dst: dst_url,
                                        timestamp: get_timestamp(),
                                    });
                                    redis::cmd("RPOP")
                                        .arg(&ENV.redis_working_queue)
                                        .query(conn)?;
                                    info!(
                                        "task queue: restarting task {} -> {}",
                                        task.id, new_task_id
                                    );
                                } else {
                                    // no timeout tasks
                                    break;
                                }
                            }
                        } else {
                            redis::cmd("RPOP")
                                .arg(&ENV.redis_working_queue)
                                .query(conn)?;
                            info!("task queue: removing stale task {}", task.id,);
                        }
                    } else {
                        // bad element, remove it
                        redis::cmd("RPOP")
                            .arg(&ENV.redis_working_queue)
                            .query(conn)?;
                        info!("task queue: removing unknown element from working queue");
                    }
                }
            }
        }
    }

    Ok(())
}

impl SystemService for TaskManagerActor {
    fn service_started(&mut self, ctx: &mut Context<Self>) {
        info!("task manager is up");
        let client = redis::Client::open(ENV.redis_url.clone()).expect("redis client");
        self.client = Some(client);
        ctx.run_interval(Duration::from_secs(10), |actor, ctx| {
            if let Err(err) = monitor(actor, ctx) {
                warn!("Error occurred in task manager: {}", err);
                sentry::capture_message(
                    &format!("Error occurred in task manager : {}", err),
                    sentry::Level::Error,
                );
                // close connection and try again
                actor.conn = None;
            }
        });
    }
}

#[derive(Message, Serialize, Deserialize)]
#[rtype(result = "bool")]
pub struct SubmitBuildTask {
    pub id: String,
    pub src: String,
    pub dst: String,
    pub timestamp: u64,
}

impl Handler<SubmitBuildTask> for TaskManagerActor {
    type Result = bool;

    fn handle(&mut self, req: SubmitBuildTask, _ctx: &mut Context<Self>) -> bool {
        if let Some(conn) = self.conn.as_mut() {
            if redis::cmd("LPUSH")
                .arg(&ENV.redis_waiting_queue)
                .arg(serde_json::to_string(&req).expect("to json"))
                .query::<()>(conn)
                .is_ok()
            {
                return true;
            }
        } else {
            warn!("no redis conn, fail to submit build task");
        }
        false
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct SetDb {
    pub db: DbPool,
}

impl Handler<SetDb> for TaskManagerActor {
    type Result = ();

    fn handle(&mut self, req: SetDb, _ctx: &mut Context<Self>) {
        self.db = Some(req.db);
    }
}

#[derive(Message)]
#[rtype(result = "GetMetricResponse")]
pub struct GetMetric;

#[derive(MessageResponse)]
pub struct GetMetricResponse {
    pub len_waiting: u64,
    pub len_working: u64,
}

impl Handler<GetMetric> for TaskManagerActor {
    type Result = GetMetricResponse;

    fn handle(&mut self, _req: GetMetric, _ctx: &mut Context<Self>) -> GetMetricResponse {
        let mut len_waiting = 0;
        let mut len_working = 0;
        if let Some(conn) = self.conn.as_mut() {
            len_waiting = redis::cmd("LLEN")
                .arg(&ENV.redis_waiting_queue)
                .query(conn)
                .unwrap_or(0);
            len_working = redis::cmd("LLEN")
                .arg(&ENV.redis_working_queue)
                .query(conn)
                .unwrap_or(0);
        }
        GetMetricResponse {
            len_waiting,
            len_working,
        }
    }
}

pub fn get_task_manager() -> Addr<TaskManagerActor> {
    TaskManagerActor::from_registry()
}
