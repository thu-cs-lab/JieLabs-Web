use wasm_bindgen::prelude::*;
use vhdl_lang::{Source, VHDLParser, SrcPos, Latin1String};
use std::path::Path;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct Pos {
    from_line: u32,
    from_char: u32,
    to_line: u32,
    to_char: u32,
}

impl Pos {
    fn from_srcpos(srcpos: &SrcPos) -> Pos {
        Pos {
            from_line: srcpos.start().line,
            from_char: srcpos.start().character,

            to_line: srcpos.end().line,
            to_char: srcpos.end().character,
        }
    }
}

#[derive(Serialize, Deserialize)]
enum SignalDirection {
    #[serde(rename="input")]
    Input,

    #[serde(rename="output")]
    Output,

    #[serde(rename="unsupported")]
    Unsupported,
}

impl From<vhdl_lang::ast::Mode> for SignalDirection {
    fn from(mode: vhdl_lang::ast::Mode) -> SignalDirection {
        use vhdl_lang::ast::Mode;
        match mode {
            Mode::In => SignalDirection::Input,
            Mode::Out => SignalDirection::Output,
            _ => SignalDirection::Unsupported,
        }
    }
}

#[derive(Serialize, Deserialize)]
struct SignalInfo {
    name: String,
    pos: Pos,
    dir: SignalDirection,
}

#[derive(Serialize, Deserialize)]
struct EntityInfo {
    name: String,
    decl: Pos,
    pub(crate) signals: Vec<SignalInfo>,
}

#[derive(Serialize, Deserialize, Default)]
struct ParseResult {
    entities: Vec<EntityInfo>,
    top: Option<u64>,
}

// TODO: fallback top srcpos
#[wasm_bindgen]
pub fn parse(s: &str, top_name: Option<String>) -> JsValue {
    let s = Source::inline(Path::new("design.vhdl"), s);
    let parser = VHDLParser::default();
    let mut diagnostics = Vec::new();
    let parsed = parser.parse_design_source(&s, &mut diagnostics);

    let mut top = None;
    let mut entities = Vec::new();

    for unit in parsed.design_units {
        use vhdl_lang::ast::AnyDesignUnit::*;
        use vhdl_lang::ast::AnyPrimaryUnit::*;
        use vhdl_lang::ast::*;

        if let Primary(Entity(ent)) = unit {
            let name = ent.name().name();

            let srcpos: &SrcPos = ent.ident().as_ref();

            let mut entity = EntityInfo {
                name: name.to_string(),
                decl: Pos::from_srcpos(srcpos),

                signals: Vec::new(),
            };

            if let Some(ref ports) = ent.port_clause {
                for port in ports {
                    if let InterfaceDeclaration::Object(decl) = port {
                        entity.signals.push(SignalInfo {
                            name: decl.ident.to_string(),
                            pos: Pos::from_srcpos(decl.ident.as_ref()),
                            dir: decl.mode.into(),
                        });
                    }

                    // TODO: Support other types of interface decls
                }
            }

            entities.push(entity);

            if let Some(ref top_ident) = top_name {
                let latin_ident = Latin1String::new(top_ident.as_bytes());

                if name == &latin_ident {
                    top = Some(entities.len() as u64);
                }
            }
        }
    }

    let result = ParseResult {
        entities,
        top,
    };

    JsValue::from_serde(&result).unwrap()
}
