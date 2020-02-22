use crate::board_manager::{get_board_manager, BoardInfo, RegisterBoard, RouteToUser};
use crate::common::IOSetting;
use actix::prelude::*;
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use log::*;
use serde_derive::{Deserialize, Serialize};
use serde_json;
use std::time::{Duration, Instant};

pub struct WSBoard {
    remote: String,
    authenticated: bool,
    software_version: String,
    hardware_version: String,
    last_heartbeat: Instant,
}

impl Actor for WSBoard {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        info!("ws_board client {} goes online", self.remote);
        ctx.run_interval(Duration::from_secs(20), |actor, ctx| {
            if Instant::now().duration_since(actor.last_heartbeat) > Duration::from_secs(60) {
                warn!("ws_board client {} has no heartbeat", actor.remote);
                ctx.stop();
            } else {
                ctx.ping(b"");
            }
        });
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        info!("ws_board client {} goes offline", self.remote);
    }
}

#[derive(Serialize, Deserialize)]
pub struct AuthenticateArgs {
    password: String,
    software_version: String,
    hardware_version: String,
}

#[derive(Serialize, Deserialize)]
pub enum WSBoardMessageB2S {
    Authenticate(AuthenticateArgs),
    ProgramBitstreamFinish(bool),
    ReportIOChange(IOSetting),
}

#[derive(Serialize, Deserialize)]
pub enum WSBoardMessageS2B {
    SetIOOutput(IOSetting),
    SetIODirection(IOSetting),
    SubscribeIOChange(String),
    UnsubscribeIOChange(String),
    EnableUserClock(u64),
    DisableUserClock(String),
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WSBoard {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => {
                ctx.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                if self.authenticated {
                    debug!("ws_board client {} heartbeat", self.remote);
                    self.last_heartbeat = Instant::now();
                }
            }
            Ok(ws::Message::Text(text)) => match serde_json::from_str::<WSBoardMessageB2S>(&text) {
                Ok(msg) => match msg {
                    WSBoardMessageB2S::Authenticate(auth) => {
                        if !self.authenticated {
                            let expected = std::env::var("BOARD_PASS").unwrap_or(String::new());
                            if auth.password == expected {
                                self.authenticated = true;
                                self.software_version = auth.software_version;
                                self.hardware_version = auth.hardware_version;
                                info!("ws_board client {} is authenticated", self.remote);
                                get_board_manager().do_send(RegisterBoard {
                                    addr: ctx.address(),
                                    info: BoardInfo {
                                        remote: self.remote.clone(),
                                        software_version: self.software_version.clone(),
                                        hardware_version: self.hardware_version.clone(),
                                    },
                                });
                            } else {
                                warn!(
                                    "ws_board client {} authentication failed, closing",
                                    self.remote
                                );
                                ctx.stop();
                            }
                        }
                    }
                    _ if !self.authenticated => {
                        warn!(
                            "ws_board client {} did not authenticate, closing",
                            self.remote
                        );
                        ctx.stop();
                    }
                    _ => {
                        get_board_manager().do_send(RouteToUser {
                            addr: ctx.address(),
                            info: BoardInfo {
                                remote: self.remote.clone(),
                                software_version: self.software_version.clone(),
                                hardware_version: self.hardware_version.clone(),
                            },
                            action: msg,
                        });
                    }
                },
                Err(_err) => {
                    warn!(
                        "ws_board client {} sent wrong message, closing",
                        self.remote
                    );
                    ctx.stop();
                }
            },
            Ok(ws::Message::Binary(_bin)) => {}
            Ok(ws::Message::Close(_)) => {
                info!("ws_board client {} closed connection", self.remote);
                ctx.stop();
            }
            _ => ctx.stop(),
        }
    }
}

impl WSBoard {
    fn new(remote: &str) -> Self {
        Self {
            remote: String::from(remote),
            software_version: String::from("Unknown"),
            hardware_version: String::from("Unknown"),
            last_heartbeat: Instant::now(),
            authenticated: false,
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct SendToBoard {
    pub action: WSBoardMessageS2B,
}

impl Handler<SendToBoard> for WSBoard {
    type Result = ();

    fn handle(&mut self, req: SendToBoard, ctx: &mut Self::Context) {
        ctx.text(serde_json::to_string(&req.action).unwrap());
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct ProgramBitstream {
    pub data: bytes::Bytes,
}

impl Handler<ProgramBitstream> for WSBoard {
    type Result = ();

    fn handle(&mut self, req: ProgramBitstream, ctx: &mut Self::Context) {
        ctx.binary(req.data);
    }
}

pub async fn ws_board(req: HttpRequest, stream: web::Payload) -> Result<HttpResponse, Error> {
    let conn = req.connection_info();
    let remote = conn.remote();
    ws::start(
        WSBoard::new(remote.unwrap_or("Unknown Remote")),
        &req,
        stream,
    )
}

mod test {
    #[test]
    fn show_serialized() {
        use super::*;
        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageB2S::Authenticate(AuthenticateArgs {
                password: String::from("password"),
                software_version: String::from("1.0"),
                hardware_version: String::from("0.1"),
            }))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageB2S::ProgramBitstreamFinish(true)).unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageB2S::ReportIOChange(IOSetting {
                mask: None,
                data: Some(String::from("1111")),
            }))
            .unwrap()
        );

        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageS2B::SetIOOutput(IOSetting {
                mask: Some(String::from("1111")),
                data: Some(String::from("1111")),
            }))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageS2B::SetIODirection(IOSetting {
                mask: Some(String::from("1111")),
                data: Some(String::from("1111")),
            }))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageS2B::SubscribeIOChange(String::from(""))).unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageS2B::UnsubscribeIOChange(String::from("")))
                .unwrap()
        );
    }
}
