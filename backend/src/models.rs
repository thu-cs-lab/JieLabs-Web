use crate::schema::{jobs, users};

#[derive(Debug, Queryable, AsChangeset, Identifiable)]
pub struct User {
    pub id: i32,
    pub user_name: String,
    pub password: String,
    pub real_name: Option<String>,
    pub class: Option<String>,
    pub student_id: Option<String>,
    pub role: String,
}

#[derive(Debug, Insertable)]
#[table_name = "users"]
pub struct NewUser {
    pub user_name: String,
    pub password: String,
    pub real_name: Option<String>,
    pub class: Option<String>,
    pub student_id: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Queryable, AsChangeset, Identifiable)]
pub struct Job {
    pub id: i32,
    pub submitter: String,
    pub type_: String,
    pub source: String,
    pub status: Option<String>,
    pub destination: Option<String>,
    pub task_id: Option<String>,
}

#[derive(Debug, Insertable)]
#[table_name = "jobs"]
pub struct NewJob {
    pub submitter: String,
    pub type_: String,
    pub source: String,
    pub status: Option<String>,
    pub destination: Option<String>,
    pub task_id: Option<String>,
}
