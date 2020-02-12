use backend;
use dotenv::dotenv;
use diesel::prelude::*;

fn main() {
    dotenv().ok();
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let conn = backend::DbConnection::establish(&url).expect("connect");

    let new_user = backend::models::NewUser {
        user_name: String::from("foo"),
        password: backend::users::hash_password("bar"),
        real_name: Some(String::from("baz")),
        student_id: Some(String::from("2020000202")),
        class: Some(String::from("1"))
    };
    diesel::insert_into(backend::schema::users::table)
        .values(&new_user)
        .execute(&conn)
        .expect("insert should not fail");
}