#[macro_use]
extern crate diesel;

use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};

pub type DbConnection = SqliteConnection;
type DbPool = Pool<ConnectionManager<DbConnection>>;

pub mod models;
pub mod schema;
pub mod users;
pub mod ws_board;
