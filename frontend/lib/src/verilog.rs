use super::*;
use verilog_lang::{
    ast::{Parse, SourceText, DataTypeOrImplicit},
    parser::Parser,
};

impl From<&verilog_lang::diagnostic::Severity> for Severity {
    fn from(s: &verilog_lang::diagnostic::Severity) -> Severity {
        use verilog_lang::diagnostic::Severity::*;
        match *s {
            Warning => Self::Warning,
            Error => Self::Error,
        }
    }
}

impl From<&verilog_lang::diagnostic::Diagnostic> for Diagnostic {
    fn from(d: &verilog_lang::diagnostic::Diagnostic) -> Diagnostic {
        Diagnostic {
            pos: d.pos.into(),
            msg: format!("{}", d.msg),
            severity: (&d.severity).into(),
        }
    }
}

impl From<verilog_lang::lexer::Span> for Pos {
    fn from(span: verilog_lang::lexer::Span) -> Pos {
        Pos {
            from_line: span.from.row as u32,
            from_char: span.from.col as u32,

            to_line: span.to.row as u32,
            to_char: span.to.col as u32 + 1,
        }
    }
}

impl From<&verilog_lang::ast::PortDirection> for SignalDirection {
    fn from(dir: &verilog_lang::ast::PortDirection) -> SignalDirection {
        use verilog_lang::ast::PortDirection::*;
        match *dir {
            Input => SignalDirection::Input,
            Output => SignalDirection::Output,
            _ => SignalDirection::Output,
        }
    }
}

fn arity_from_unpacked(
    dimension: &verilog_lang::ast::UnpackedDimension,
    parser: &Parser,
) -> Option<ArityInfo> {
    if dimension.from.is_some() && dimension.to.is_some() {
        let from_token = parser.get_token(dimension.from.as_ref().unwrap().token);
        let to_token = parser.get_token(dimension.to.as_ref().unwrap().token);
        let from = from_token.text.parse::<u64>().unwrap_or(0);
        let to = to_token.text.parse::<u64>().unwrap_or(0);
        Some(ArityInfo { from, to })
    } else {
        None
    }
}

fn arity_from_packed(
    dimension: &verilog_lang::ast::PackedDimension,
    parser: &Parser,
) -> Option<ArityInfo> {
    if dimension.from.is_some() && dimension.to.is_some() {
        let from_token = parser.get_token(dimension.from.as_ref().unwrap().token);
        let to_token = parser.get_token(dimension.to.as_ref().unwrap().token);
        let from = from_token.text.parse::<u64>().unwrap_or(0);
        let to = to_token.text.parse::<u64>().unwrap_or(0);
        Some(ArityInfo { from, to })
    } else {
        None
    }
}

pub(crate) fn parse(s: &str, top_name: Option<String>) -> ParseResult {
    let mut top = None;
    let mut entities = Vec::new();

    let mut parser = Parser::from(s);
    if let Some(source_text) = SourceText::parse(&mut parser) {
        println!("{:?}", source_text);
        for module in &source_text.modules {
            let name_token = parser.get_token(module.header.identifier.token);
            if let Some(top_name) = &top_name {
                if top_name == name_token.text {
                    top = Some(entities.len() as u64);
                }
            }
            let mut signals = vec![];
            let ports = &module.header.ports;
            for (_attr, port) in &ports.ports {
                if port.direction.is_some() {
                    let token = parser.get_token(port.identifier.token);
                    // TODO: multi-dimension?
                    let arity = if let Some(dimension) = port.dimensions.first() {
                        arity_from_unpacked(dimension, &parser)
                    } else {
                        if let Some(net_port_type) = &port.net_port_type {
                            match &net_port_type.data_type_or_implicit {
                                DataTypeOrImplicit::Data(data) => {
                                    if let Some(dimension) = data.dimensions.first() {
                                        arity_from_packed(dimension, &parser)
                                    } else {
                                        None
                                    }
                                },
                                DataTypeOrImplicit::ImplicitData(data) => {
                                    if let Some(dimension) = data.dimensions.first() {
                                        arity_from_packed(dimension, &parser)
                                    } else {
                                        None
                                    }
                                }
                            }
                        } else {
                            None
                        }
                    };
                    signals.push(SignalInfo {
                        name: String::from(token.text),
                        pos: token.span.into(),
                        dir: port.direction.as_ref().unwrap().into(),
                        arity,
                    });
                }
            }

            for item in &module.items {
                match item {
                    verilog_lang::ast::ModuleItem::Port(port) => {
                        use verilog_lang::ast::PortDeclaration::*;
                        let (dir, port_type, identifiers) = match port {
                            Input(_attr, decl) => {
                                (SignalDirection::Input, &decl.port_type, &decl.identifiers)
                            }
                            Output(_attr, decl) => {
                                (SignalDirection::Output, &decl.port_type, &decl.identifiers)
                            }
                            InOut(_attr, decl) => (
                                SignalDirection::Unsupported,
                                &decl.port_type,
                                &decl.identifiers,
                            ),
                        };
                        let mut arity = None;
                        match &port_type.data_type_or_implicit {
                            verilog_lang::ast::DataTypeOrImplicit::Data(data) => {
                                if let Some(dimension) = data.dimensions.first() {
                                    arity = arity_from_packed(dimension, &parser);
                                }
                            }
                            verilog_lang::ast::DataTypeOrImplicit::ImplicitData(implicit) => {
                                if let Some(dimension) = implicit.dimensions.first() {
                                    arity = arity_from_packed(dimension, &parser);
                                }
                            }
                        }
                        for (port, _dimension) in &identifiers.ports {
                            let token = parser.get_token(port.token);
                            // TODO: handle unpacked dimension

                            signals.push(SignalInfo {
                                name: String::from(token.text),
                                pos: token.span.into(),
                                dir: dir.clone(),
                                arity: arity.clone(),
                            });
                        }
                    }
                    _ => {}
                }
            }

            entities.push(EntityInfo {
                name: String::from(name_token.text),
                decl: name_token.span.into(),
                signals,
            });
        }
    }

    let result = ParseResult {
        entities,
        top,
        diagnostics: parser.get_diag().into_iter().map(Into::into).collect(),
    };

    result
}

#[cfg(test)]
mod test {
    use super::*;
    #[test]
    fn test_entity() {
        let result = parse(
            "module mod_top (
                input abc,
                input wire [2:0] def
    ); endmodule",
            None,
        );
        assert_eq!(result.entities.len(), 1);
        assert_eq!(result.entities[0].name, "mod_top");
        assert_eq!(result.entities[0].signals.len(), 2);
        assert_eq!(result.entities[0].signals[0].name, "abc");
        assert_eq!(result.entities[0].signals[0].arity, None);
        assert_eq!(result.entities[0].signals[1].name, "def");
        assert_eq!(
            result.entities[0].signals[1].arity,
            Some(ArityInfo { from: 2, to: 0 })
        );
    }
}
