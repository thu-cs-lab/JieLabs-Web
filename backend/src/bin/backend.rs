#[macro_use]
extern crate diesel_migrations;
use actix_session::CookieSession;
use actix_web::cookie::SameSite;
use actix_web::http::header;
use actix_web::{middleware, web, App, HttpServer};
use backend::{
    board, env::ENV, file, metric, session, task, task_manager, user, ws_board, ws_user,
    DbConnection,
};
use diesel::r2d2::{ConnectionManager, Pool};
use dotenv::dotenv;
use log::*;
use ring::{digest, rand};
use sentry;

embed_migrations!();

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let _guard = if let Some(url) = ENV.sentry_url.clone() {
        info!("Sentry report is up");
        Some(sentry::init((
            url,
            sentry::ClientOptions {
                release: sentry::release_name!(),
                ..Default::default()
            },
        )))
    } else {
        None
    };

    let conn = ENV.database_url.clone();
    let manager = ConnectionManager::<DbConnection>::new(conn);
    let pool = Pool::builder().build(manager).expect("create db pool");
    let conn = pool.get().expect("get conn");
    embedded_migrations::run_with_output(&conn, &mut std::io::stdout()).expect("migration");
    drop(conn);

    task_manager::get_task_manager().do_send(task_manager::SetDb { db: pool.clone() });

    let secret = ENV.cookie_secret.clone();
    let secret = digest::digest(&digest::SHA512, secret.as_bytes());
    HttpServer::new(move || {
        App::new()
            .data(pool.clone())
            .data(rand::SystemRandom::new())
            .wrap(
                actix_cors::Cors::default()
                    .supports_credentials()
                    .allowed_methods(vec!["GET", "POST"])
                    .allowed_headers(vec![header::CONTENT_TYPE, header::UPGRADE])
                    .allowed_origin("http://localhost:3000")
                    .allowed_origin("https://lab.cs.tsinghua.edu.cn"),
            )
            .wrap(
                CookieSession::private(secret.as_ref()) // Private is required because we are storing OAuth state in cookie
                    .name("jielabsweb-rich")
                    .path(&ENV.cookie_path)
                    .secure(!cfg!(debug_assertions))
                    .same_site(SameSite::None),
            )
            .wrap(middleware::Logger::default())
            .service(
                web::scope(&ENV.api_root)
                    .service(web::resource("/ws_board").route(web::get().to(ws_board::ws_board)))
                    .service(web::resource("/ws_user").route(web::get().to(ws_user::ws_user)))
                    .service(
                        web::scope("/user")
                            .service(user::list)
                            .service(user::count)
                            .service(user::update)
                            .service(user::create)
                            .service(user::remove),
                    )
                    .service(web::scope("/file").service(file::upload))
                    .service(
                        web::scope("/board")
                            .service(board::list)
                            .service(board::config_board)
                            .service(board::get_version)
                            .service(board::update_version),
                    )
                    .service(
                        web::scope("/task")
                            .service(task::build)
                            .service(task::finish)
                            .service(task::get)
                            .service(task::list)
                            .service(task::count)
                            .service(task::list_self),
                    )
                    .service(web::scope("/metric").service(metric::get))
                    .service(
                        web::scope("/")
                            .service(session::login)
                            .service(session::logout)
                            .service(session::info)
                            .service(session::portal_fwd)
                            .service(session::portal_cb),
                    ),
            )
    })
    .bind(&std::env::var("LISTEN").unwrap_or("127.0.0.1:8080".to_string()))?
    .run()
    .await
}
