use wasm_bindgen::prelude::*;
use std::path::Path;
use serde::{Serialize, Deserialize};

mod vhdl;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace=console)]
    fn log(s: &str);
}

#[derive(Serialize, Deserialize)]
struct Pos {
    from_line: u32,
    from_char: u32,
    to_line: u32,
    to_char: u32,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all="lowercase")]
enum SignalDirection {
    Input,
    Output,
    Unsupported,
}

#[derive(Serialize, Deserialize)]
struct ArityInfo {
    from: u64,
    to: u64,
}

#[derive(Serialize, Deserialize)]
struct SignalInfo {
    name: String,
    pos: Pos,
    dir: SignalDirection,
    arity: Option<ArityInfo>,
}

#[derive(Serialize, Deserialize)]
struct EntityInfo {
    name: String,
    decl: Pos,
    pub(crate) signals: Vec<SignalInfo>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all="lowercase")]
enum Severity {
    Hint,
    Info,
    Warning,
    Error,
}

#[derive(Serialize, Deserialize)]
struct Diagnostic {
    pos: Pos,
    msg: String,
    severity: Severity,
}

#[derive(Serialize, Deserialize, Default)]
struct ParseResult {
    entities: Vec<EntityInfo>,
    top: Option<u64>,
    diagnostics: Vec<Diagnostic>,
}

// TODO: fallback top srcpos
#[wasm_bindgen]
pub fn parse(s: &str, top_name: Option<String>) -> JsValue {
    let result = vhdl::parse(s, top_name);

    JsValue::from_serde(&result).unwrap()
}
