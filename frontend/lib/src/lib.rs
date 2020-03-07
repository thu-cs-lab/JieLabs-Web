use maze_routing;
use serde::{Deserialize, Serialize};
use std::path::Path;
use wasm_bindgen::prelude::*;

mod verilog;
mod vhdl;

#[cfg(not(test))]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace=console)]
    fn log(s: &str);
}

#[cfg(test)]
fn log(s: &str) {
    println!("{}", s);
}

#[derive(Serialize, Deserialize, Debug)]
struct Pos {
    from_line: u32,
    from_char: u32,
    to_line: u32,
    to_char: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
enum SignalDirection {
    Input,
    Output,
    Unsupported,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ArityInfo {
    from: u64,
    to: u64,
}

#[derive(Serialize, Deserialize, Debug)]
struct SignalInfo {
    name: String,
    pos: Pos,
    dir: SignalDirection,
    arity: Option<ArityInfo>,
}

#[derive(Serialize, Deserialize, Debug)]
struct EntityInfo {
    name: String,
    decl: Pos,
    pub(crate) signals: Vec<SignalInfo>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
enum Severity {
    Hint,
    Info,
    Warning,
    Error,
}

#[derive(Serialize, Deserialize, Debug)]
struct Diagnostic {
    pos: Pos,
    msg: String,
    severity: Severity,
}

#[derive(Serialize, Deserialize, Default, Debug)]
struct ParseResult {
    entities: Vec<EntityInfo>,
    top: Option<u64>,
    diagnostics: Vec<Diagnostic>,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub enum Language {
    VHDL,
    Verilog,
}

// TODO: fallback top srcpos
#[wasm_bindgen]
pub fn parse(s: &str, top_name: Option<String>, lang: Language) -> JsValue {
    let result = match lang {
        Language::VHDL => vhdl::parse(s, top_name),
        Language::Verilog => verilog::parse(s, top_name),
    };

    JsValue::from_serde(&result).unwrap()
}
