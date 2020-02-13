use actix::prelude::*;
use log::*;
use redis;

#[derive(Default)]
pub struct TaskManagerActor {
    client: Option<redis::Client>,
    conn: Option<redis::Connection>,
}

impl actix::Supervised for TaskManagerActor {}

impl Actor for TaskManagerActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Context<Self>) {}
}

impl SystemService for TaskManagerActor {
    fn service_started(&mut self, _ctx: &mut Context<Self>) {
        info!("task manager is up");
        let client = redis::Client::open(std::env::var("REDIS_URL").expect("REDIS_URL"))
            .expect("redis client");
        let conn = client.get_connection().expect("redis connection");
        self.client = Some(client);
        self.conn = Some(conn);
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct SubmitBuildTask {
    pub source: String,
}

impl Handler<SubmitBuildTask> for TaskManagerActor {
    type Result = ();

    fn handle(&mut self, req: SubmitBuildTask, _ctx: &mut Context<Self>) {
        let conn = self.conn.as_mut().unwrap();
        redis::cmd("LPUSH")
            .arg("jielabs-tasks")
            .arg("")
            .execute(conn);
    }
}

pub fn get_task_manager() -> Addr<TaskManagerActor> {
    TaskManagerActor::from_registry()
}
