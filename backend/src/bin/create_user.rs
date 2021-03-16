use backend;
use diesel::prelude::*;
use dotenv::dotenv;
use structopt::StructOpt;

#[derive(StructOpt)]
struct Args {
    #[structopt(short, long)]
    user_name: String,

    #[structopt(short, long)]
    password: String,

    #[structopt(short, long)]
    real_name: Option<String>,

    #[structopt(short, long)]
    student_id: Option<String>,

    #[structopt(short, long)]
    class: Option<String>,

    #[structopt(short = "R", long)]
    role: Option<String>,
}

#[paw::main]
fn main(args: Args) {
    dotenv().ok();
    let url = backend::env::ENV.database_url.clone();
    let conn = backend::DbConnection::establish(&url).expect("connect");

    let new_user = backend::models::NewUser {
        user_name: args.user_name,
        password: Some(backend::session::hash_password(&args.password)),
        real_name: args.real_name,
        student_id: args.student_id,
        class: args.class,
        role: args.role,
        last_login: None,
    };
    diesel::insert_into(backend::schema::users::table)
        .values(&new_user)
        .execute(&conn)
        .expect("insert should not fail");
}
