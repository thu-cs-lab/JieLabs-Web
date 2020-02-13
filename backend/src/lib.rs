#[macro_use]
extern crate diesel;

use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};

pub type DbConnection = SqliteConnection;
type DbPool = Pool<ConnectionManager<DbConnection>>;

pub mod board;
pub mod board_manager;
pub mod models;
pub mod schema;
pub mod session;
pub mod user;
pub mod ws_board;
