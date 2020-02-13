use backend::ws_board;
use env_logger;
use serde_json;
use ws::connect;

fn main() {
    env_logger::init();
    connect("ws://127.0.0.1:8080/api/ws_board", |out| {
        out.send(r#"{"Authenticate":{"password":"password","software_version":"1.0","hardware_version":"0.1"}}"#).unwrap();
        move |msg| {
            println!("Client got message '{}'. ", msg);
            if let ws::Message::Text(text) = msg {
                if let Ok(msg) = serde_json::from_str::<ws_board::WSBoardMessageS2B>(&text) {
                    match msg {
                        ws_board::WSBoardMessageS2B::ProgramBitstream(_data) => {
                           println!("Bitstream programmed");
                           out.send(serde_json::to_string(&ws_board::WSBoardMessageB2S::ProgramBitstreamFinish(true)).unwrap()).unwrap();
                        }
                        ws_board::WSBoardMessageS2B::SetIODirection(direction) => {
                           println!("Set IO Direction {:?}", direction);
                        }
                        ws_board::WSBoardMessageS2B::SetIOOutput(output) => {
                           println!("Set IO Output {:?}", output);
                        }
                        ws_board::WSBoardMessageS2B::SubscribeIOChange(_) => {
                           println!("Subscribe to io change");
                        }
                        ws_board::WSBoardMessageS2B::UnsubscribeIOChange(_) => {
                           println!("Unsubscribe to io change");
                        }
                    }
                }
            }
            Ok(())
        }
    }).unwrap();
}
