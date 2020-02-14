use crate::common::{generate_uuid, get_download_url, get_timestamp, get_upload_url};
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
    waiting_queue: String,
    working_queue: String,
}

impl actix::Supervised for TaskManagerActor {}

impl Actor for TaskManagerActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Context<Self>) {}
}

impl SystemService for TaskManagerActor {
    fn service_started(&mut self, ctx: &mut Context<Self>) {
        info!("task manager is up");
        let client = redis::Client::open(std::env::var("REDIS_URL").expect("REDIS_URL"))
            .expect("redis client");
        let conn = client.get_connection().expect("redis connection");
        self.client = Some(client);
        self.conn = Some(conn);
        self.waiting_queue = std::env::var("REDIS_WAITING_QUEUE").expect("REDIS_WAITING_QUEUE");
        self.working_queue = std::env::var("REDIS_WORKING_QUEUE").expect("REDIS_WORKING_QUEUE");
        ctx.run_interval(Duration::from_secs(10), |actor, ctx| {
            if actor.db.is_none() || actor.conn.is_none() {
                return;
            }
            let conn = actor.conn.as_mut().unwrap();
            let db = actor.db.as_mut().unwrap();
            let db_conn = db.get().unwrap();

            let len_waiting: u64 = redis::cmd("LLEN")
                .arg(&actor.waiting_queue)
                .query(conn)
                .unwrap();
            let len_working: u64 = redis::cmd("LLEN")
                .arg(&actor.working_queue)
                .query(conn)
                .unwrap();
            if len_waiting > 0 || len_working > 0 {
                info!(
                    "task queue: {} waiting, {} working",
                    len_waiting, len_working
                );
                while let Some(last_working) = redis::cmd("LINDEX")
                    .arg(&actor.working_queue)
                    .arg("-1")
                    .query::<Option<String>>(conn)
                    .unwrap()
                {
                    if let Ok(task) = serde_json::from_str::<SubmitBuildTask>(&last_working) {
                        // find job by task
                        if let Ok(mut job) = jobs::dsl::jobs
                            .filter(jobs::dsl::task_id.eq(&task.id))
                            .first::<Job>(&db_conn)
                        {
                            if job.status.is_some() {
                                // done, remove it
                                redis::cmd("RPOP").arg(&actor.working_queue).execute(conn);
                                info!("task queue: removing finished task {}", task.id,);
                            } else {
                                if get_timestamp() - task.timestamp > 10 {
                                    // timeout, assign a new task id and destination
                                    let new_task_id = generate_uuid();
                                    let new_dest = generate_uuid();
                                    job.task_id = Some(new_task_id.clone());
                                    job.destination = Some(new_dest.clone());
                                    let src_url = get_download_url(&job.source);
                                    let dst_url = get_upload_url(&new_dest);
                                    diesel::update(&job).set(&job).execute(&db_conn).unwrap();
                                    ctx.address().do_send(SubmitBuildTask {
                                        id: new_task_id.clone(),
                                        src: src_url,
                                        dst: dst_url,
                                        timestamp: get_timestamp(),
                                    });
                                    redis::cmd("RPOP").arg(&actor.working_queue).execute(conn);
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
                            redis::cmd("RPOP").arg(&actor.working_queue).execute(conn);
                            info!("task queue: removing stale task {}", task.id,);
                        }
                    } else {
                        // bad element, remove it
                        redis::cmd("RPOP").arg(&actor.working_queue).execute(conn);
                        info!("task queue: removing unknown element from working queue");
                    }
                }
            }
        });
    }
}

#[derive(Message, Serialize, Deserialize)]
#[rtype(result = "()")]
pub struct SubmitBuildTask {
    pub id: String,
    pub src: String,
    pub dst: String,
    pub timestamp: u64,
}

impl Handler<SubmitBuildTask> for TaskManagerActor {
    type Result = ();

    fn handle(&mut self, req: SubmitBuildTask, _ctx: &mut Context<Self>) {
        if let Some(conn) = self.conn.as_mut() {
            redis::cmd("LPUSH")
                .arg(&self.waiting_queue)
                .arg(serde_json::to_string(&req).expect("to json"))
                .execute(conn);
        } else {
            warn!("no redis conn, fail to submit build task");
        }
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

pub fn get_task_manager() -> Addr<TaskManagerActor> {
    TaskManagerActor::from_registry()
}
