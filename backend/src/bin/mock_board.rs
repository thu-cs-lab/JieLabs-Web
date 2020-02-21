use backend::common::IOSetting;
use backend::ws_board;
use env_logger;
use serde_json;
use std::sync::{Arc, Mutex};
use structopt::StructOpt;
use ws::connect;

const STEP_TIME_MS: u64 = 100;

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
                                    mask: Some(String::from("1111")),
                                    data: Some(String::from("1111")),
                                })).unwrap()).unwrap();
                            }
                            ws_board::WSBoardMessageS2B::SetIOOutput(output) => {
                                println!("Set IO Output {:?}", output);
                                out.send(serde_json::to_string(&ws_board::WSBoardMessageB2S::ReportIOChange(IOSetting {
                                    mask: Some(String::from("1111")),
                                    data: Some(String::from("1111")),
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
                                            let mask = (0..64).map(|_| "0").collect::<String>();
                                            *mask.chars().nth(shift).as_mut().unwrap() = '1';
                                            *mask.chars().nth(last_shift).as_mut().unwrap() = '1';
                                            let data = (0..64).map(|_| "0").collect::<String>();
                                            *data.chars().nth(shift).as_mut().unwrap() = '1';
                                            sender.send(serde_json::to_string(&ws_board::WSBoardMessageB2S::ReportIOChange(IOSetting {
                                                mask: Some(mask),
                                                data: Some(data),
                                            })).unwrap()).unwrap();
                                            std::thread::sleep(std::time::Duration::from_millis(STEP_TIME_MS));
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
