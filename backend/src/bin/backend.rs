use actix_identity::{CookieIdentityPolicy, IdentityService};
use actix_web::{middleware, web, App, HttpServer};
use backend::{users, ws_board, DbConnection};
use diesel::r2d2::{ConnectionManager, Pool};
use dotenv::dotenv;
use ring::digest;

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let conn = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let manager = ConnectionManager::<DbConnection>::new(conn);
    let pool = Pool::builder().build(manager).expect("create db pool");

    let secret = std::env::var("COOKIE_SECRET").unwrap_or(String::new());
    let secret = digest::digest(&digest::SHA512, secret.as_bytes());
    HttpServer::new(move || {
        App::new()
            .data(pool.clone())
            .wrap(
                actix_cors::Cors::new()
                    .supports_credentials()
                    .finish(),
            )
            .wrap(IdentityService::new(
                CookieIdentityPolicy::new(secret.as_ref())
                    .name("jielabsweb")
                    .secure(false),
            ))
            .wrap(middleware::Logger::default())
            .service(
                web::scope("/api")
                    .service(web::resource("/ws_board").route(web::get().to(ws_board::ws_board)))
                    .service(
                        web::scope("/")
                            .service(users::login)
                            .service(users::logout)
                            .service(users::info),
                    ),
            )
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
