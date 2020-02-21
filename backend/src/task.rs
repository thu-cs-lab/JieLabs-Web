use crate::common::{err, generate_uuid, get_download_url, get_timestamp, get_upload_url};
use crate::models::*;
use crate::schema::jobs;
use crate::session::get_user;
use crate::task_manager::{get_task_manager, SubmitBuildTask};
use crate::DbPool;
use actix_identity::Identity;
use actix_web::{get, post, web, HttpResponse, Result};
use diesel::prelude::*;
use serde_derive::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct BuildRequest {
    source: String,
    metadata: String,
}

#[post("/build")]
async fn build(
    id: Identity,
    body: web::Json<BuildRequest>,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), conn) = get_user(&id, conn).await? {
        let body = body.into_inner();

        let dest = generate_uuid();
        let task_id = generate_uuid();

        let src_url = get_download_url(&body.source);
        let dst_url = get_upload_url(&dest);

        let new_job = NewJob {
            submitter: user.user_name,
            type_: String::from("build"),
            source: body.source,
            metadata: body.metadata,
            status: None,
            destination: Some(dest.clone()),
            task_id: Some(task_id.clone()),
        };
        let job_id = conn
            .transaction::<_, diesel::result::Error, _>(|| {
                diesel::insert_into(jobs::table)
                    .values(&new_job)
                    .execute(&conn)?;
                let job_id = jobs::dsl::jobs
                    .select(jobs::dsl::id)
                    .filter(jobs::dsl::task_id.eq(&task_id))
                    .first::<i32>(&conn)?;
                Ok(job_id)
            })
            .map_err(err)?;

        get_task_manager().do_send(SubmitBuildTask {
            id: task_id.clone(),
            src: src_url,
            dst: dst_url,
            timestamp: get_timestamp(),
        });
        return Ok(HttpResponse::Ok().json(job_id));
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[derive(Serialize, Deserialize)]
struct FinishRequest {
    task_id: String,
    status: String,
}

#[post("/finish")]
async fn finish(body: web::Json<FinishRequest>, pool: web::Data<DbPool>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let Ok(mut job) = jobs::dsl::jobs
        .filter(jobs::dsl::task_id.eq(&body.task_id))
        .first::<Job>(&conn)
    {
        if job.status.is_none() {
            // not finished
            job.status = Some(body.status.clone());
            return Ok(
                HttpResponse::Ok().json(diesel::update(&job).set(&job).execute(&conn).is_ok())
            );
        }
        return Ok(HttpResponse::Ok().json(true));
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[derive(Serialize, Deserialize)]
struct JobListRequest {
    offset: Option<i64>,
    limit: Option<i64>,
}

#[derive(Serialize, Deserialize)]
struct JobListResponse {
    offset: i64,
    limit: i64,
    jobs: Vec<JobInfo>,
}

#[derive(Serialize, Deserialize)]
struct JobInfo {
    id: i32,
    submitter: String,
    type_: String,
    metadata: String,
    status: Option<String>,
    src_url: String,
    dst_url: Option<String>,
}

impl From<Job> for JobInfo {
    fn from(job: Job) -> JobInfo {
        let src_url = get_download_url(&job.source);
        let dst_url = job.destination.map(|dest| get_download_url(&dest));
        JobInfo {
            id: job.id,
            submitter: job.submitter,
            type_: job.type_,
            metadata: job.metadata,
            status: job.status,
            src_url,
            dst_url,
        }
    }
}

#[get("/list")]
async fn list(
    id: Identity,
    pool: web::Data<DbPool>,
    query: web::Query<JobListRequest>,
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), conn) = get_user(&id, conn).await? {
        if user.role == "admin" {
            let offset = query.offset.unwrap_or(0);
            let limit = query.limit.unwrap_or(5);
            let jobs = web::block(move || {
                jobs::dsl::jobs
                    .order(jobs::dsl::id.desc())
                    .offset(offset)
                    .limit(limit)
                    .load::<Job>(&conn)
            })
            .await
            .map_err(err)?;
            return Ok(HttpResponse::Ok().json(JobListResponse {
                offset,
                limit,
                jobs: jobs.into_iter().map(JobInfo::from).collect(),
            }));
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[get("/")]
async fn list_self(
    id: Identity,
    pool: web::Data<DbPool>,
    query: web::Query<JobListRequest>,
) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), conn) = get_user(&id, conn).await? {
        let offset = query.offset.unwrap_or(0);
        let limit = query.limit.unwrap_or(5);

        let res = jobs::dsl::jobs
            .filter(jobs::dsl::submitter.eq(user.user_name))
            .order(jobs::dsl::id.desc())
            .offset(offset)
            .limit(limit)
            .load::<Job>(&conn);

        if let Ok(jobs) = res {
            return Ok(HttpResponse::Ok().json(JobListResponse {
                offset,
                limit,
                jobs: jobs.into_iter().map(JobInfo::from).collect(),
            }));
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}

#[get("/get/{job_id}")]
async fn get(id: Identity, pool: web::Data<DbPool>, path: web::Path<i32>) -> Result<HttpResponse> {
    let conn = pool.get().map_err(err)?;
    if let (Some(user), conn) = get_user(&id, conn).await? {
        if let Ok(job) = jobs::dsl::jobs.find(*path).first::<Job>(&conn) {
            if user.role == "admin" || user.user_name == job.submitter {
                return Ok(HttpResponse::Ok().json(JobInfo::from(job)));
            }
        }
    }
    Ok(HttpResponse::Forbidden().finish())
}
