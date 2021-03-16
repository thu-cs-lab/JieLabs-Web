use crate::schema::{jobs, users};
use chrono::{DateTime, Utc};

#[derive(Debug, Queryable, AsChangeset, Identifiable)]
pub struct User {
    pub id: i32,
    pub user_name: String,
    pub password: Option<String>,
    pub real_name: Option<String>,
    pub class: Option<String>,
    pub student_id: Option<String>,
    pub role: String,
    pub last_login: Option<DateTime<Utc>>,
}

#[derive(Debug, Insertable)]
#[table_name = "users"]
pub struct NewUser {
    pub user_name: String,
    pub password: Option<String>,
    pub real_name: Option<String>,
    pub class: Option<String>,
    pub student_id: Option<String>,
    pub role: String,
    pub last_login: Option<DateTime<Utc>>,
}

#[derive(Debug, Queryable, AsChangeset, Identifiable)]
pub struct Job {
    pub id: i32,
    pub submitter: String,
    pub type_: String,
    pub source: String,
    pub status: Option<String>,
    pub destination: Option<String>,
    pub metadata: String,
    pub task_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Insertable)]
#[table_name = "jobs"]
pub struct NewJob {
    pub submitter: String,
    pub type_: String,
    pub source: String,
    pub status: Option<String>,
    pub destination: Option<String>,
    pub metadata: String,
    pub task_id: Option<String>,
}
