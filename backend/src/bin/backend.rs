#[macro_use]
extern crate diesel_migrations;
use actix_identity::{CookieIdentityPolicy, IdentityService};
use actix_web::{middleware, web, App, HttpServer};
use backend::{board, file, session, task, task_manager, user, ws_board, ws_user, DbConnection};
use diesel::r2d2::{ConnectionManager, Pool};
use dotenv::dotenv;
use ring::digest;

embed_migrations!();

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let conn = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let manager = ConnectionManager::<DbConnection>::new(conn);
    let pool = Pool::builder().build(manager).expect("create db pool");
    let conn = pool.get().expect("get conn");
    embedded_migrations::run_with_output(&conn, &mut std::io::stdout()).expect("migration");
    drop(conn);

    task_manager::get_task_manager().do_send(task_manager::SetDb { db: pool.clone() });

    let secret = std::env::var("COOKIE_SECRET").unwrap_or(String::new());
    let secret = digest::digest(&digest::SHA512, secret.as_bytes());
    HttpServer::new(move || {
        App::new()
            .data(pool.clone())
            .wrap(actix_cors::Cors::new().supports_credentials().finish())
            .wrap(IdentityService::new(
                CookieIdentityPolicy::new(secret.as_ref())
                    .name("jielabsweb")
                    .secure(false),
            ))
            .wrap(middleware::Logger::default())
            .service(
                web::scope("/api")
                    .service(web::resource("/ws_board").route(web::get().to(ws_board::ws_board)))
                    .service(web::resource("/ws_user").route(web::get().to(ws_user::ws_user)))
                    .service(
                        web::scope("/user")
                            .service(user::list)
                            .service(user::update)
                            .service(user::remove),
                    )
                    .service(web::scope("/file").service(file::upload))
                    .service(
                        web::scope("/board")
                            .service(board::list)
                            .service(board::get_version)
                            .service(board::update_version),
                    )
                    .service(
                        web::scope("/task")
                            .service(task::build)
                            .service(task::finish)
                            .service(task::get)
                            .service(task::list)
                            .service(task::list_self),
                    )
                    .service(
                        web::scope("/")
                            .service(session::login)
                            .service(session::logout)
                            .service(session::info),
                    ),
            )
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
