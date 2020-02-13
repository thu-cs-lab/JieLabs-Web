use env_logger;
use ws::{connect, CloseCode};

fn main() {
    env_logger::init();
    connect("ws://127.0.0.1:8080/api/ws_board", |out| {
        out.send(r#"{"Authenticate":{"password":"password","software_version":"1.0","hardware_version":"0.1"}}"#).unwrap();
        move |msg| {
            println!("Client got message '{}'. ", msg);

            out.close(CloseCode::Normal)
        }
    }).unwrap();
}