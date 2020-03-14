use backend;
use diesel::prelude::*;
use dotenv::dotenv;

use structopt::StructOpt;

#[derive(StructOpt)]
struct Args {
    #[structopt(short, long)]
    id: i32,
}

#[paw::main]
fn main(args: Args) {
    dotenv().ok();
    let url = backend::env::ENV.database_url.clone();
    let db_conn = backend::DbConnection::establish(&url).expect("connect");
    let client = redis::Client::open(backend::env::ENV.redis_url.clone()).expect("redis client");
    let mut conn = client.get_connection().unwrap();

    let job = backend::schema::jobs::dsl::jobs
        .filter(backend::schema::jobs::dsl::id.eq(args.id))
        .first::<backend::models::Job>(&db_conn)
        .unwrap();
    if job.status.is_none() {
        let src_url = backend::common::get_download_url(&job.source);
        let dst_url = backend::common::get_upload_url(&job.destination.unwrap());
        let req = backend::task_manager::SubmitBuildTask {
            id: job.task_id.clone().unwrap(),
            src: src_url,
            dst: dst_url,
            timestamp: backend::common::get_timestamp(),
        };
        redis::cmd("LPUSH")
            .arg(&backend::env::ENV.redis_waiting_queue)
            .arg(serde_json::to_string(&req).expect("to json"))
            .execute(&mut conn);
        println!("Added task {:?}", job.task_id);
    }
}
