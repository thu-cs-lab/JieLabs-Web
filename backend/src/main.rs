use actix_web::{get, middleware, web, App, HttpServer, Responder};
use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use dotenv::dotenv;

type DbConnection = SqliteConnection;
type DbPool = Pool<ConnectionManager<DbConnection>>;

#[get("/{id}/{name}/index.html")]
async fn index(pool: web::Data<DbPool>, info: web::Path<(u32, String)>) -> impl Responder {
    format!("Hello {}! id:{}", info.1, info.0)
}

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let conn = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let manager = ConnectionManager::<DbConnection>::new(conn);
    let pool = Pool::builder().build(manager).expect("create db pool");

    HttpServer::new(move || {
        App::new()
            .data(pool.clone())
            .wrap(middleware::Logger::default())
            .service(index)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
