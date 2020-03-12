use crate::board_manager::{
    get_board_manager, ProgramBitstreamToBoard, RequestForBoard, RouteToBoard,
};
use crate::common::{download_s3, IOSetting};
use crate::env::ENV;
use crate::models::*;
use crate::schema::jobs;
use crate::session::get_user;
use crate::ws_board::{WSBoardMessageB2S, WSBoardMessageS2B};
use crate::DbPool;
use actix::prelude::*;
use actix_http::ws::Item;
use actix_identity::Identity;
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use diesel::prelude::*;
use lazy_static::lazy_static;
use log::*;
use serde_derive::{Deserialize, Serialize};
use serde_json;
use std::sync::Mutex;
use std::time::{Duration, Instant};

lazy_static! {
    pub static ref ONLINE_USERS: Mutex<Vec<String>> = Mutex::new(vec![]);
}

pub struct WSUser {
    user_name: String,
    remote: String,
    last_heartbeat: Instant,
    has_board: bool,

    text_buffer: Option<Vec<u8>>,
    pool: DbPool,
}

impl Actor for WSUser {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        info!("ws_user client {} goes online", self.remote);
        ONLINE_USERS.lock().unwrap().push(self.user_name.clone());
        ctx.run_interval(Duration::from_secs(5), |actor, ctx| {
            if Instant::now().duration_since(actor.last_heartbeat) > Duration::from_secs(30) {
                warn!("ws_user client {} has no heartbeat", actor.remote);
                ctx.stop();
            } else {
                ctx.ping(b"");
            }
        });
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        info!("ws_user client {} goes offline", self.remote);
        let mut users = ONLINE_USERS.lock().unwrap();
        if let Some(index) = users.iter().position(|x| *x == self.user_name) {
            users.remove(index);
        }
    }
}

#[derive(Serialize, Deserialize)]
pub enum WSUserMessageU2S {
    RequestForBoard(String),
    ToBoard(WSBoardMessageS2B),
    ProgramBitstream(i32),
}

#[derive(Serialize, Deserialize)]
pub enum WSUserMessageS2U {
    ReportIOChange(IOSetting),
    BoardAllocateResult(Option<String>),
    BoardDisconnected(String),
    ProgramBitstreamFinish(bool),
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WSUser {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => {
                ctx.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                debug!("ws_user client {} heartbeat", self.remote);
                self.last_heartbeat = Instant::now();
            }
            Ok(ws::Message::Text(text)) => self.handle_message(&text, ctx),
            Ok(ws::Message::Binary(_bin)) => {}
            Ok(ws::Message::Continuation(cont)) => match cont {
                Item::FirstText(bytes) => {
                    self.text_buffer = Some(Vec::from(&bytes[..]));
                }
                Item::FirstBinary(_bytes) => {}
                Item::Continue(bytes) => {
                    if let Some(text_buffer) = &mut self.text_buffer {
                        text_buffer.extend(bytes);
                    }
                }
                Item::Last(bytes) => {
                    if let Some(mut text_buffer) = self.text_buffer.take() {
                        text_buffer.extend(bytes);
                        if let Ok(text) = String::from_utf8(text_buffer) {
                            self.handle_message(&text, ctx);
                        }
                    }
                }
            },
            Ok(ws::Message::Close(_)) => {
                info!("ws_user client {} closed connection", self.remote);
                ctx.stop();
            }
            _ => ctx.stop(),
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct RequestForBoardResult(pub Option<String>);

impl Handler<RequestForBoardResult> for WSUser {
    type Result = ();

    fn handle(&mut self, req: RequestForBoardResult, ctx: &mut Self::Context) -> () {
        self.has_board = req.0.is_some();
        ctx.text(serde_json::to_string(&WSUserMessageS2U::BoardAllocateResult(req.0)).unwrap());
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct SendToUser {
    pub action: WSBoardMessageB2S,
}

impl Handler<SendToUser> for WSUser {
    type Result = ();

    fn handle(&mut self, req: SendToUser, ctx: &mut Self::Context) {
        ctx.text(serde_json::to_string(&req.action).unwrap());
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct BoardDisconnected;

impl Handler<BoardDisconnected> for WSUser {
    type Result = ();

    fn handle(&mut self, _req: BoardDisconnected, ctx: &mut Self::Context) {
        self.has_board = false;
        ctx.text(
            serde_json::to_string(&WSUserMessageS2U::BoardDisconnected(String::from(""))).unwrap(),
        );
    }
}

impl WSUser {
    fn new(remote: &str, user_name: &str, pool: DbPool) -> Self {
        Self {
            remote: String::from(remote),
            user_name: String::from(user_name),
            last_heartbeat: Instant::now(),
            has_board: false,

            text_buffer: None,
            pool,
        }
    }

    fn handle_message(&mut self, text: &str, ctx: &mut <Self as Actor>::Context) {
        match serde_json::from_str::<WSUserMessageU2S>(text) {
            Ok(msg) => match msg {
                WSUserMessageU2S::RequestForBoard(_) => {
                    if !self.has_board {
                        get_board_manager().do_send(RequestForBoard {
                            user: ctx.address(),
                            user_name: self.user_name.clone(),
                        });
                    }
                }
                WSUserMessageU2S::ToBoard(action) => {
                    if self.has_board {
                        get_board_manager().do_send(RouteToBoard {
                            user: ctx.address(),
                            user_name: self.user_name.clone(),
                            action,
                        });
                    }
                }
                WSUserMessageU2S::ProgramBitstream(job_id) => {
                    let mut fail = true;
                    if let Ok(conn) = self.pool.get() {
                        if let Ok(job) = jobs::dsl::jobs.find(job_id).first::<Job>(&conn) {
                            if job.status.is_some()
                                && job.destination.is_some()
                                && job.submitter == self.user_name
                            {
                                // job is done
                                fail = false;
                                let download = download_s3(job.destination.unwrap().clone());
                                let wrapped = actix::fut::wrap_future::<_, Self>(download);
                                let then = wrapped.map(|res, actor, ctx| {
                                    if let Some(data) = res {
                                        get_board_manager().do_send(ProgramBitstreamToBoard {
                                            user: ctx.address(),
                                            user_name: actor.user_name.clone(),
                                            data,
                                        });
                                    } else {
                                        info!(
                                            "bitstream program failed because of download failure"
                                        );
                                    }
                                });
                                ctx.spawn(then);
                            } else {
                                info!("bitstream program rejected by wrong status/user");
                            }
                        } else {
                            info!("bitstream program rejected by wrong job id");
                        }
                    }
                    if fail {
                        ctx.text(
                            serde_json::to_string(&WSUserMessageS2U::ProgramBitstreamFinish(false))
                                .unwrap(),
                        );
                    }
                }
            },
            Err(_err) => {
                warn!("ws_user client {} sent wrong message, closing", self.remote);
                ctx.stop();
            }
        }
    }
}

pub async fn ws_user(
    id: Identity,
    pool: web::Data<DbPool>,
    req: HttpRequest,
    stream: web::Payload,
) -> Result<HttpResponse, Error> {
    let conn = req.connection_info();
    let remote = conn.remote();
    let conn = pool.get().unwrap();
    if let (Some(user), _conn) = get_user(&id, conn).await? {
        return ws::start(
            WSUser::new(
                remote.unwrap_or("Unknown Remote"),
                &user.user_name,
                pool.get_ref().clone(),
            ),
            &req,
            stream,
        );
    }
    // For debugging
    if ENV.allow_anonymous_ws_user {
        return ws::start(
            WSUser::new(
                remote.unwrap_or("Unknown Remote"),
                &format!("Anonymous-{:?}", remote),
                pool.get_ref().clone(),
            ),
            &req,
            stream,
        );
    }
    Ok(HttpResponse::Forbidden().finish())
}

mod test {
    #[test]
    fn show_serialized() {
        use super::*;
        println!(
            "{}",
            serde_json::to_string(&WSUserMessageU2S::RequestForBoard(String::from(""))).unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSUserMessageU2S::ToBoard(WSBoardMessageS2B::SetIOOutput(
                IOSetting {
                    mask: Some(String::from("1111")),
                    data: Some(String::from("1111")),
                }
            )))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSUserMessageU2S::ToBoard(
                WSBoardMessageS2B::SetIODirection(IOSetting {
                    mask: Some(String::from("1111")),
                    data: Some(String::from("1111")),
                })
            ))
            .unwrap()
        );

        println!(
            "{}",
            serde_json::to_string(&WSUserMessageS2U::BoardAllocateResult(Some(String::from(
                "id1234"
            ))))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSUserMessageS2U::ReportIOChange(IOSetting {
                mask: None,
                data: Some(String::from("1111")),
            }))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSUserMessageS2U::BoardDisconnected(String::from(""))).unwrap()
        );
    }
}
