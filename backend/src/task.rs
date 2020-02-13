use crate::common::generate_uuid;
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
        get_task_manager().do_send(SubmitBuildTask {
            id: task_id,
            src: body.source.clone(),
            dst: dest,
        });
        return HttpResponse::Ok().json(true);
    }
    HttpResponse::Forbidden().finish()
}
