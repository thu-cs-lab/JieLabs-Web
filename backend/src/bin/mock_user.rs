use backend::ws_user;
use env_logger;
use log::*;
use serde_json;
use std::fmt::Write;
use std::fs::File;
use std::io::Read;
use structopt::StructOpt;
use ws::connect;

#[derive(StructOpt, Clone)]
struct Args {
    #[structopt(short, long, default_value = "127.0.0.1:8080")]
    host: String,

    #[structopt(short, long)]
    bitstream: Option<String>,
}

#[paw::main]
fn main(args: Args) {
    env_logger::init();
    connect(format!("ws://{}/api/ws_user", args.host), |out| {
        out.send(r#"{"RequestForBoard":""}"#).unwrap();
        let bitstream = args.bitstream.clone();
        move |msg| {
            println!("Client got message '{}'. ", msg);
            if let ws::Message::Text(text) = msg {
                if let Ok(msg) = serde_json::from_str::<ws_user::WSUserMessageS2U>(&text) {
                    match msg {
                        ws_user::WSUserMessageS2U::BoardAllocateResult(res) => {
                            println!("Board allocation result: {:?}", res);
                            if res.is_some() {
                                out.send(r#"{"ToBoard":{"SetIOOutput":{"mask":"","data":""}}}"#)
                                    .unwrap();
                                info!("SetIOOutput sent");
                                out.send(r#"{"ToBoard":{"SetIODirection":{"mask":"","data":""}}}"#)
                                    .unwrap();
                                info!("SetIODirection sent");
                                out.send(r#"{"ToBoard":{"SubscribeIOChange":""}}"#).unwrap();
                                info!("SubscribeIOChange sent");
                                if let Some(bitstream_path) = bitstream.clone() {
                                    let mut file = File::open(bitstream_path).unwrap();
                                    let mut data = vec![];
                                    file.read_to_end(&mut data).unwrap();
                                    let mut s = String::new();
                                    for &byte in &data {
                                        write!(&mut s, "{:02X}", byte).expect("Unable to write");
                                    }

                                    out.send(format!(
                                        r#"{{"ToBoard":{{"ProgramBitstream":"{}"}}}}"#,
                                        s
                                    ))
                                    .unwrap();
                                    info!("ProgramBitstream sent");
                                }
                            }
                        }
                        ws_user::WSUserMessageS2U::ReportIOChange(change) => {
                            println!("IO changed {:?}", change);
                        }
                        ws_user::WSUserMessageS2U::BoardDisconnected(_) => {
                            println!("Board disconnected");
                        }
                        ws_user::WSUserMessageS2U::ProgramBitstreamFinish(result) => {
                            println!("Program bitstream finished with {}", result);
                        }
                    }
                }
            }
            Ok(())
        }
    })
    .unwrap();
}
