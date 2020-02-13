use actix::prelude::*;
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
struct AuthenticateArgs {
    password: String,
    software_version: String,
    hardware_version: String,
}

#[derive(Serialize, Deserialize)]
enum WSBoardMessageB2S {
    Authenticate(AuthenticateArgs),
    ProgramBitstreamFinish(bool),
    ReportIOChange(IOSetting),
}

#[derive(Serialize, Deserialize)]
enum WSBoardMessageS2B {
    ProgramBitstream(Vec<u8>),
    SetIOOutput(IOSetting),
    SetIODirection(IOSetting),
    SubscribeIOChange,
    UnsubscribeIOChange,
}

struct WSBoard {
    remote: String,
    authenticated: bool,
    last_heartbeat: Instant,
}

impl Actor for WSBoard {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        info!("ws client {} goes online", self.remote);
        ctx.run_interval(Duration::from_secs(5), |actor, ctx| {
            if Instant::now().duration_since(actor.last_heartbeat) > Duration::from_secs(30) {
                warn!("ws client {} has no heartbeat", actor.remote);
                ctx.stop();
            } else {
                ctx.ping(b"");
            }
        });
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WSBoard {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => {
                ctx.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                if self.authenticated {
                    debug!("ws client {} heartbeat", self.remote);
                    self.last_heartbeat = Instant::now();
                }
            }
            Ok(ws::Message::Text(text)) => match serde_json::from_str::<WSBoardMessageB2S>(&text) {
                Ok(msg) => match msg {
                    WSBoardMessageB2S::Authenticate(pass) => {
                        let expected = std::env::var("BOARD_PASS").unwrap_or(String::new());
                        if pass.password == expected {
                            self.authenticated = true;
                            info!("ws client {} is authenticated", self.remote);
                        } else {
                            warn!("ws client {} authentication failed, closing", self.remote);
                            ctx.stop();
                        }
                    }
                    _ if !self.authenticated => {
                        warn!("ws client {} did not authenticate, closing", self.remote);
                        ctx.stop();
                    }
                    _ => {}
                },
                Err(_err) => {
                    warn!("ws client {} sent wrong message, closing", self.remote);
                    ctx.stop();
                }
            },
            Ok(ws::Message::Binary(_bin)) => {}
            Ok(ws::Message::Close(_)) => {
                info!("ws client {} closed connection", self.remote);
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
            last_heartbeat: Instant::now(),
            authenticated: false,
        }
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
                mask: 0b1110,
                data: 0b0100,
            }))
            .unwrap()
        );

        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageS2B::ProgramBitstream(vec![
                0xaa, 0x99, 0x55, 0x66
            ]))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageS2B::SetIOOutput(IOSetting {
                mask: 0b1011,
                data: 0b1000,
            }))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageS2B::SetIODirection(IOSetting {
                mask: 0b1000,
                data: 0b0000,
            }))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageS2B::SubscribeIOChange).unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&WSBoardMessageS2B::UnsubscribeIOChange).unwrap()
        );
    }
}
