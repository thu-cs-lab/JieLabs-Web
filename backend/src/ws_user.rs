use crate::board_manager::{get_board_manager, RequestForBoard};
use crate::session::get_user;
use crate::ws_board::WSBoard;
use crate::DbPool;
use actix::prelude::*;
use actix_identity::Identity;
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use log::*;
use serde_derive::{Deserialize, Serialize};
use serde_json;
use std::time::{Duration, Instant};

#[derive(Serialize, Deserialize)]
struct IOSetting {
    mask: u64,
    data: u64,
}

#[derive(Serialize, Deserialize)]
enum WSUserMessageU2S {
    RequestForBoard,
    SetIOOutput(IOSetting),
    SetIODirection(IOSetting),
}

#[derive(Serialize, Deserialize)]
enum WSUserMessageS2U {
    ReportIOChange(IOSetting),
    BoardAllocateResult(bool),
}

#[derive(Message)]
#[rtype(result = "()")]
pub enum BoardManagerMessage2U {
    BoardDisconnected,
}

pub struct WSUser {
    user_name: String,
    remote: String,
    last_heartbeat: Instant,
    board_addr: Option<Addr<WSBoard>>,
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
                    WSUserMessageU2S::RequestForBoard => {
                        if self.board_addr.is_none() {
                            get_board_manager()
                                .send(RequestForBoard {
                                    user: ctx.address(),
                                    user_name: self.user_name.clone(),
                                })
                                .into_actor(self)
                                .then(move |res, actor, ctx| {
                                    let res = if let Ok(Some(addr)) = res {
                                        actor.board_addr = Some(addr);
                                        true
                                    } else {
                                        false
                                    };
                                    ctx.text(
                                        serde_json::to_string(
                                            &WSUserMessageS2U::BoardAllocateResult(res),
                                        )
                                        .unwrap(),
                                    );
                                    async {}.into_actor(actor)
                                })
                                .wait(ctx);
                        }
                    }
                    _ => {}
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

impl WSUser {
    fn new(remote: &str, user_name: &str) -> Self {
        Self {
            remote: String::from(remote),
            user_name: String::from(user_name),
            last_heartbeat: Instant::now(),
            board_addr: None,
        }
    }
}

pub async fn ws_user(
    id: Identity,
    pool: web::Data<DbPool>,
    req: HttpRequest,
    stream: web::Payload,
) -> Result<HttpResponse, Error> {
    let conn = pool.get().unwrap();
    if let Some(user) = get_user(&id, &conn) {
        let conn = req.connection_info();
        let remote = conn.remote();
        return ws::start(
            WSUser::new(remote.unwrap_or("Unknown Remote"), &user.user_name),
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
            serde_json::to_string(&WSUserMessageU2S::RequestForBoard).unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSUserMessageU2S::SetIOOutput(IOSetting {
                mask: 0b1110,
                data: 0b0100,
            }))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSUserMessageU2S::SetIODirection(IOSetting {
                mask: 0b1110,
                data: 0b0100,
            }))
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
