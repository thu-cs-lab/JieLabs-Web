use super::*;
use vhdl_lang::{Latin1String, Source, SrcPos, VHDLParser};

impl From<SrcPos> for Pos {
    fn from(srcpos: SrcPos) -> Pos {
        Pos {
            from_line: srcpos.start().line,
            from_char: srcpos.start().character,

            to_line: srcpos.end().line,
            to_char: srcpos.end().character,
        }
    }
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

impl From<vhdl_lang::Diagnostic> for Diagnostic {
    fn from(d: vhdl_lang::Diagnostic) -> Diagnostic {
        Diagnostic {
            pos: d.pos.into(),
            msg: d.message,
            severity: d.severity.into(),
        }
    }
}

pub(crate) fn parse(s: &str, top_name: Option<String>) -> ParseResult {
    let mut diagnostics = Vec::new();
    let s = Source::inline(Path::new("design.vhdl"), s);
    let parser = VHDLParser::default();
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
                decl: srcpos.to_owned().into(),

                signals: Vec::new(),
            };

            if let Some(ref ports) = ent.port_clause {
                for port in ports {
                    if let InterfaceDeclaration::Object(decl) = port {
                        // Parse arity
                        let mut arity = None;

                        if let Some(ref constraint) = decl.subtype_indication.constraint {
                            let inner: &SubtypeConstraint = &constraint.item;
                            //log(&format!("{:#?}", constraint));

                            if let &SubtypeConstraint::Array(ref vec, None) = inner {
                                if let [DiscreteRange::Range(Range::Range(RangeConstraint {
                                    ref left_expr,
                                    ref right_expr,
                                    ..
                                }))] = &vec[..]
                                {
                                    if let Expression::Literal(Literal::AbstractLiteral(
                                        AbstractLiteral::Integer(left),
                                    )) = left_expr.item
                                    {
                                        if let Expression::Literal(Literal::AbstractLiteral(
                                            AbstractLiteral::Integer(right),
                                        )) = right_expr.item
                                        {
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
                            pos: decl.ident.as_ref().to_owned().into(),
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
                    top = Some(entities.len() as u64 - 1);
                }
            }
        }
    }

    let result = ParseResult {
        entities,
        top,
        diagnostics: diagnostics.into_iter().map(Into::into).collect(),
    };

    result
}

#[cfg(test)]
mod test {
    use super::*;
    #[test]
    fn test_entity() {
        let result = parse(
            "entity mod_top is
    port (
        in_1 :in std_logic;
        out_vec :out std_logic_vector (37 downto 0)
    );
end entity;",
            None,
        );
        assert_eq!(result.entities.len(), 1);
        assert_eq!(result.entities[0].name, "mod_top");
        assert_eq!(result.entities[0].signals.len(), 2);
        assert_eq!(result.entities[0].signals[0].name, "in_1");
    }
}
