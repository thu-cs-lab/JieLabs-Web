use crate::board_manager::{get_board_manager, RequestForBoard, RouteToBoard};
use crate::common::IOSetting;
use crate::session::get_user;
use crate::ws_board::WSBoardMessageS2B;
use crate::DbPool;
use actix::prelude::*;
use actix_identity::Identity;
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use log::*;
use serde_derive::{Deserialize, Serialize};
use serde_json;
use std::time::{Duration, Instant};

pub struct WSUser {
    user_name: String,
    remote: String,
    last_heartbeat: Instant,
    has_board: bool,
}

impl Actor for WSUser {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        info!("ws_user client {} goes online", self.remote);
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
    }
}

#[derive(Serialize, Deserialize)]
pub enum WSUserMessageU2S {
    RequestForBoard(String),
    ToBoard(WSBoardMessageS2B),
}

#[derive(Serialize, Deserialize)]
pub enum WSUserMessageS2U {
    ReportIOChange(IOSetting),
    BoardAllocateResult(bool),
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
            Ok(ws::Message::Text(text)) => match serde_json::from_str::<WSUserMessageU2S>(&text) {
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
                },
                Err(_err) => {
                    warn!("ws_user client {} sent wrong message, closing", self.remote);
                    ctx.stop();
                }
            },
            Ok(ws::Message::Binary(_bin)) => {}
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
pub struct RequestForBoardResult(pub bool);

impl Handler<RequestForBoardResult> for WSUser {
    type Result = ();

    fn handle(&mut self, req: RequestForBoardResult, ctx: &mut Self::Context) -> () {
        self.has_board = req.0;
        ctx.text(
            serde_json::to_string(&WSUserMessageS2U::BoardAllocateResult(self.has_board)).unwrap(),
        );
    }
}

impl WSUser {
    fn new(remote: &str, user_name: &str) -> Self {
        Self {
            remote: String::from(remote),
            user_name: String::from(user_name),
            last_heartbeat: Instant::now(),
            has_board: false,
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
    if let Some(user) = get_user(&id, &conn) {
        return ws::start(
            WSUser::new(remote.unwrap_or("Unknown Remote"), &user.user_name),
            &req,
            stream,
        );
    }
    // For debugging
    if std::env::var("ALLOW_ANONYMOUS_WS_USER").is_ok() {
        return ws::start(
            WSUser::new(
                remote.unwrap_or("Unknown Remote"),
                &format!("Anonymous-{:?}", remote),
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
                    mask: 0b1110,
                    data: 0b0100,
                }
            )))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSUserMessageU2S::ToBoard(
                WSBoardMessageS2B::SetIODirection(IOSetting {
                    mask: 0b1110,
                    data: 0b0100,
                })
            ))
            .unwrap()
        );

        println!(
            "{}",
            serde_json::to_string(&WSUserMessageS2U::BoardAllocateResult(true)).unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSUserMessageS2U::ReportIOChange(IOSetting {
                mask: 0b1011,
                data: 0b1000,
            }))
            .unwrap()
        );
    }
}
