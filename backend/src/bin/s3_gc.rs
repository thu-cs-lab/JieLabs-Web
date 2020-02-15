use backend::models::*;
use backend::schema::jobs;
use backend::common::*;
use backend::DbConnection;
use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use dotenv::dotenv;
use rusoto_s3::{ListObjectsRequest, S3};
use std::collections::BTreeSet;

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let conn = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let manager = ConnectionManager::<DbConnection>::new(conn);
    let pool = Pool::builder().build(manager).expect("create db pool");
    let conn = pool.get().expect("get conn");
    let jobs = jobs::dsl::jobs.load::<Job>(&conn).unwrap();
    let mut id = BTreeSet::new();
    for job in &jobs {
        id.insert(job.source.clone());
        if let Some(dest) = &job.destination {
            id.insert(dest.clone());
        }
    }
    println!("Live: {} files", id.len());

    let client = s3_client();
    let bucket = S3_BUCKET.clone();
    let req = ListObjectsRequest {
        bucket,
        ..Default::default()
    };
    let res = client.list_objects(req).await.unwrap();
    let mut keys = BTreeSet::new();
    for object in &res.contents.unwrap() {
        if let Some(key) = &object.key {
            keys.insert(key.clone());
        }
    }
    println!("All: {} files", keys.len());
    let diff: Vec<_> = keys.difference(&id).cloned().collect();
    println!("GC'ed: {} files", diff.len());
    Ok(())
}
