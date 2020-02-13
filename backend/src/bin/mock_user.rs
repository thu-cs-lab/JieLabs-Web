use backend::ws_user;
use env_logger;
use serde_json;
use ws::connect;

fn main() {
    env_logger::init();
    connect("ws://127.0.0.1:8080/api/ws_user", |out| {
        out.send(r#"{"RequestForBoard":""}"#).unwrap();
        move |msg| {
            println!("Client got message '{}'. ", msg);
            if let ws::Message::Text(text) = msg {
                if let Ok(msg) = serde_json::from_str::<ws_user::WSUserMessageS2U>(&text) {
                    match msg {
                        ws_user::WSUserMessageS2U::BoardAllocateResult(res) => {
                            println!("Board allocation result: {}", res);
                            if res {
                                out.send(r#"{"ToBoard":{"SetIOOutput":{"mask":14,"data":4}}}"#).unwrap();
                            }
                        }
                        ws_user::WSUserMessageS2U::ReportIOChange(change) => {
                            println!("IO changed {:?}", change);
                        }
                    }
                }
            }
            Ok(())
        }
    })
    .unwrap();
}
