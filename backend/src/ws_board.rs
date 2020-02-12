use actix::prelude::*;
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use log::*;
use serde_derive::{Deserialize, Serialize};
use serde_json;
use std::time::{Duration, Instant};
use std::collections::BTreeMap;

#[derive(Serialize, Deserialize)]
enum WSBoardMessageB2S {
    Authenticate(String),
    ProgramBitstreamFinish(bool),
    ReportIOChange(BTreeMap<String, bool>),
}

#[derive(Serialize, Deserialize)]
enum WSBoardMessageS2B {
    ProgramBitstream(Vec<u8>),
    SetIOStatus(BTreeMap<String, bool>),
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
                debug!("ws client {} heartbeat", self.remote);
                self.last_heartbeat = Instant::now();
            }
            Ok(ws::Message::Text(text)) => match serde_json::from_str::<WSBoardMessageB2S>(&text) {
                Ok(msg) => match msg {
                    WSBoardMessageB2S::Authenticate(pass) => {
                        let expected = std::env::var("BOARD_PASS").unwrap_or(String::new());
                        if pass == expected {
                            self.authenticated = true;
                        }
                    }
                    _ if !self.authenticated => {
                        ctx.stop();
                    }
                    _ => {},
                },
                Err(_err) => {
                    warn!("ws client {} sent wrong message, kick it", self.remote);
                    ctx.stop();
                }
            },
            Ok(ws::Message::Binary(_bin)) => {}
            Ok(ws::Message::Close(_)) => {
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
