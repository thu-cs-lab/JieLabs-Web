use backend;
use diesel::prelude::*;
use dotenv::dotenv;
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use serde::{Deserialize, Serialize};
use std::fs::File;
use structopt::StructOpt;

#[derive(StructOpt)]
struct Args {
    #[structopt(short, long)]
    input_csv: String,

    #[structopt(short, long)]
    output_csv: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Row {
    user_name: String,
    password: Option<String>,
    real_name: Option<String>,
    student_id: Option<String>,
    class: Option<String>,
    role: Option<String>,
}

#[paw::main]
fn main(args: Args) {
    dotenv().ok();
    let url = backend::env::ENV.database_url.clone();
    let conn = backend::DbConnection::establish(&url).expect("connect");

    let input = File::open(args.input_csv).unwrap();
    let output = File::create(args.output_csv).unwrap();
    let mut rdr = csv::Reader::from_reader(input);
    let mut wtr = csv::Writer::from_writer(output);
    conn.transaction::<_, diesel::result::Error, _>(|| {
        for result in rdr.deserialize() {
            let mut record: Row = result.unwrap();
            println!("adding {:?}", record);
            let password = record.password.unwrap_or_else(|| {
                String::from_utf8(
                    thread_rng()
                        .sample_iter(&Alphanumeric)
                        .take(10)
                        .collect::<Vec<u8>>(),
                )
                .unwrap()
            });
            record.password = Some(password.clone());
            wtr.serialize(record.clone()).unwrap();

            let new_user = backend::models::NewUser {
                user_name: record.user_name,
                password: Some(backend::session::hash_password(&password)),
                real_name: record.real_name,
                student_id: record.student_id,
                class: record.class,
                role: record.role.unwrap_or(String::from("user")),
                last_login: None,
            };
            diesel::insert_into(backend::schema::users::table)
                .values(&new_user)
                .execute(&conn)?;
        }
        Ok(())
    })
    .expect("run transaction");
    println!("All users added");
}
