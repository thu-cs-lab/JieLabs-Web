#[macro_use]
extern crate diesel;

use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};

pub type DbConnection = PgConnection;
type DbPool = Pool<ConnectionManager<DbConnection>>;

pub mod board;
pub mod board_manager;
pub mod common;
pub mod env;
pub mod file;
pub mod metric;
pub mod models;
pub mod schema;
pub mod session;
pub mod task;
pub mod task_manager;
pub mod user;
pub mod ws_board;
pub mod ws_user;
