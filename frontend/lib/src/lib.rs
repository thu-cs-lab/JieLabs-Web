use wasm_bindgen::prelude::*;
use vhdl_lang::{Source, VHDLParser, SrcPos, Latin1String};
use std::path::Path;
use serde::{Serialize, Deserialize};

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
#[serde(rename_all="lowercase")]
enum SignalDirection {
    Input,
    Output,
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

impl From<vhdl_lang::Severity> for Severity {
    fn from(s: vhdl_lang::Severity) -> Severity {
        use vhdl_lang::Severity::*;
        match s {
            Hint => Self::Hint,
            Info => Self::Info,
            Warning => Self::Warning,
            Error => Self::Error,
        }
    }
}

#[derive(Serialize, Deserialize)]
struct Diagnostic {
    pos: Pos,
    msg: String,
    severity: Severity,
}

impl From<vhdl_lang::Diagnostic> for Diagnostic {
    fn from(d: vhdl_lang::Diagnostic) -> Diagnostic {
        Diagnostic {
            pos: Pos::from_srcpos(&d.pos),
            msg: d.message,
            severity: d.severity.into(),
        }
    }
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
                        // Parse arity
                        let mut arity = None;

                        if let Some(ref constraint) = decl.subtype_indication.constraint {
                            use vhdl_lang::ast::{SubtypeConstraint, Range, RangeConstraint, Expression, Literal, AbstractLiteral};
                            let inner: &SubtypeConstraint = &constraint.item;
                            log(&format!("{:#?}", constraint));

                            if let &SubtypeConstraint::Array(
                                ref vec,
                                None,
                            ) = inner {
                                if let [DiscreteRange::Range(Range::Range(RangeConstraint { ref left_expr, ref right_expr, .. }))] = &vec[..] {
                                    if let Expression::Literal(Literal::AbstractLiteral(AbstractLiteral::Integer(left))) = left_expr.item {
                                        if let Expression::Literal(Literal::AbstractLiteral(AbstractLiteral::Integer(right))) = right_expr.item {
                                            arity = Some(ArityInfo {
                                                from: left,
                                                to: right,
                                            });
                                        }
                                    }
                                }
                            }
                        }

                        entity.signals.push(SignalInfo {
                            name: decl.ident.to_string(),
                            pos: Pos::from_srcpos(decl.ident.as_ref()),
                            dir: decl.mode.into(),
                            arity,
                        });
                    }
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
        diagnostics: diagnostics.into_iter().map(Into::into).collect(),
    };

    JsValue::from_serde(&result).unwrap()
}
