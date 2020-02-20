use backend::common::IOSetting;
use backend::ws_board;
use env_logger;
use serde_json;
use structopt::StructOpt;
use ws::connect;
use std::sync::{Arc, Mutex};

#[derive(StructOpt, Clone)]
struct Args {
    #[structopt(short, long, default_value = "127.0.0.1:8080")]
    host: String,
}

#[paw::main]
fn main(args: Args) {
    env_logger::init();
    connect(format!("ws://{}/api/ws_board", args.host), |out| {
        out.send(r#"{"Authenticate":{"password":"password","software_version":"1.0","hardware_version":"0.1"}}"#).unwrap();
        let spawned = Arc::new(Mutex::new(false));
        move |msg| {
            println!("Client got message '{}'. ", msg);
            match msg {
                ws::Message::Text(text) => {
                    if let Ok(msg) = serde_json::from_str::<ws_board::WSBoardMessageS2B>(&text) {
                        match msg {
                            ws_board::WSBoardMessageS2B::SetIODirection(direction) => {
                                println!("Set IO Direction {:?}", direction);
                                out.send(serde_json::to_string(&ws_board::WSBoardMessageB2S::ReportIOChange(IOSetting {
                                    mask: 0b1111,
                                    data: 0b1111,
                                })).unwrap()).unwrap();
                            }
                            ws_board::WSBoardMessageS2B::SetIOOutput(output) => {
                                println!("Set IO Output {:?}", output);
                                out.send(serde_json::to_string(&ws_board::WSBoardMessageB2S::ReportIOChange(IOSetting {
                                    mask: 0b1111,
                                    data: 0b1111,
                                })).unwrap()).unwrap();
                            }
                            ws_board::WSBoardMessageS2B::SubscribeIOChange(_) => {
                                println!("Subscribe to io change");

                                let mut check = spawned.lock().unwrap();
                                if !*check {
                                    *check = true;
                                    let sender = out.clone();
                                    std::thread::spawn(move || {
                                        let mut last_shift = 0;
                                        let mut shift = 0;
                                        loop {
                                            sender.send(serde_json::to_string(&ws_board::WSBoardMessageB2S::ReportIOChange(IOSetting {
                                                mask: 1 << shift | 1 << last_shift,
                                                data: 1 << shift,
                                            })).unwrap()).unwrap();
                                            std::thread::sleep(std::time::Duration::from_millis(1000));
                                            last_shift = shift;
                                            shift = (shift + 1) % 40;
                                        }
                                    });
                                }
                            }
                            ws_board::WSBoardMessageS2B::UnsubscribeIOChange(_) => {
                                println!("Unsubscribe to io change");
                            }
                        }
                    }
                }
                ws::Message::Binary(bit) => {
                    println!("Got bitstream of length {}", bit.len());
                    out.send(serde_json::to_string(&ws_board::WSBoardMessageB2S::ProgramBitstreamFinish(true)).unwrap()).unwrap();
                }
            }
            Ok(())
        }
    }).unwrap();
}
