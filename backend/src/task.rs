use crate::common::{generate_uuid, get_download_url, get_upload_url};
use crate::models::*;
use crate::schema::jobs;
use crate::session::get_user;
use crate::task_manager::{get_task_manager, SubmitBuildTask};
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{post, web, HttpResponse, Responder};
use diesel::prelude::*;
use serde_derive::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct BuildRequest {
    source: String,
}

#[post("/build")]
async fn build(
    id: Identity,
    body: web::Json<BuildRequest>,
    pool: web::Data<DbPool>,
) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Some(user) = get_user(&id, &conn) {
        let dest = generate_uuid();
        let task_id = generate_uuid();
        let new_job = NewJob {
            submitter: user.user_name,
            type_: String::from("build"),
            source: body.source.clone(),
            status: None,
            destination: Some(dest.clone()),
            task_id: Some(task_id.clone()),
        };
        diesel::insert_into(jobs::table)
            .values(&new_job)
            .execute(&conn)
            .expect("insert shold not fail");
        let src_url = get_download_url(&body.source);
        let dst_url = get_upload_url(&dest);
        get_task_manager().do_send(SubmitBuildTask {
            id: task_id.clone(),
            src: src_url,
            dst: dst_url,
        });
        return HttpResponse::Ok().json(task_id);
    }
    HttpResponse::Forbidden().finish()
}

#[derive(Serialize, Deserialize)]
struct FinishRequest {
    task_id: String,
    status: String,
    src: String,
    dst: String,
}

#[post("/finish")]
async fn finish(body: web::Json<FinishRequest>, pool: web::Data<DbPool>) -> impl Responder {
    let conn = pool.get().unwrap();
    if let Ok(mut job) = jobs::dsl::jobs
        .filter(jobs::dsl::task_id.eq(&body.task_id))
        .first::<Job>(&conn)
    {
        if job.status.is_none() {
            // not finished
            job.status = Some(body.status.clone());
            return HttpResponse::Ok().json(diesel::update(&job).set(&job).execute(&conn).is_ok());
        }
        return HttpResponse::Ok().json(true);
    }
    HttpResponse::Forbidden().finish()
}
