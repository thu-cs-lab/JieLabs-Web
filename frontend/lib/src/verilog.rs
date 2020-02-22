use super::*;

pub(crate) fn parse(s: &str, top_name: Option<String>) -> ParseResult {
    let diagnostics = Vec::new();
    let top = None;
    let entities = Vec::new();

    let result = ParseResult {
        entities,
        top,
        diagnostics,
    };

    result
}
