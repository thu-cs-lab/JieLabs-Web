use backend::common::IOSetting;
use backend::ws_board;
use env_logger;
use serde_json;
use std::sync::{Arc, Mutex};
use structopt::StructOpt;
use ws::connect;

#[derive(StructOpt, Clone)]
struct Args {
    #[structopt(short, long, default_value = "127.0.0.1:8080")]
    host: String,

    #[structopt(short, long, default_value = "100")]
    step_time_ms: u64,

    #[structopt(short, long, default_value = "password")]
    password: String,
}

#[paw::main]
fn main(args: Args) {
    env_logger::init();
    let step_time = args.step_time_ms;
    connect(format!("ws://{}/api/ws_board", args.host), |out| {
        out.send(format!("{}{}{}", r#"{"Authenticate":{"password":""#, args.password, r#"","software_version":"1.0","hardware_version":"0.1"}}"#)).unwrap();
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
                                    mask: None,
                                    data: Some(String::from("1111")),
                                })).unwrap()).unwrap();
                            }
                            ws_board::WSBoardMessageS2B::SetIOOutput(output) => {
                                println!("Set IO Output {:?}", output);
                                out.send(serde_json::to_string(&ws_board::WSBoardMessageB2S::ReportIOChange(IOSetting {
                                    mask: None,
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
                                        let mut shift = 0;
                                        loop {
                                            let data = (0..64).map(|_| "0").collect::<String>();
                                            *data.chars().nth(shift).as_mut().unwrap() = '1';
                                            sender.send(serde_json::to_string(&ws_board::WSBoardMessageB2S::ReportIOChange(IOSetting {
                                                mask: None,
                                                data: Some(data),
                                            })).unwrap()).unwrap();
                                            std::thread::sleep(std::time::Duration::from_millis(step_time));
                                            shift = (shift + 1) % 40;
                                        }
                                    });
                                }
                            }
                            ws_board::WSBoardMessageS2B::UnsubscribeIOChange(_) => {
                                println!("Unsubscribe to io change");
                            }
                            _ => {} // Clocking related
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
