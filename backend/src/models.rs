use crate::schema::users;

#[derive(Debug, Queryable)]
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
