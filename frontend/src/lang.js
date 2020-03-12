import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { BOARDS, DEFAULT_BOARD } from './config';

/* eslint-disable no-useless-concat,no-useless-escape */

// VHDL
const INTEGER_RE = '\\d(_|\\d)*';
const EXPONENT_RE = '[eE][-+]?' + INTEGER_RE;
const DECIMAL_LITERAL_RE = INTEGER_RE + '(\\.' + INTEGER_RE + ')?' + '(' + EXPONENT_RE + ')?';
const BASED_INTEGER_RE = '\\w+';
const BASED_LITERAL_RE = INTEGER_RE + '#' + BASED_INTEGER_RE + '(\\.' + BASED_INTEGER_RE + ')?' + '#' + '(' + EXPONENT_RE + ')?';

const NUMBER_RE = '\\b(' + BASED_LITERAL_RE + '|' + DECIMAL_LITERAL_RE + ')';

const LOGIC_RE = /'[UX01ZWLH-]'/;

// Verilog
const SIZE_RE = "([1-9][0-9_]*)?";
const OCTAL_RE = `${SIZE_RE}'[sS]?[oO][0-7xXzZ][0-7xXzZ_]*`;
const BINARY_RE = `${SIZE_RE}'[sS]?[bB][01xXzZ][01xXzZ_]*`;
const HEX_RE = `${SIZE_RE}'[sS]?[hH][0-9a-fA-FxXzZ][0-9a-fA-FxXzZ_]*`;
const REAL_RE = `[0-9][0-9_*](\\.[0-9][0-9_]*)?[eE][+-]?[0-9][0-9_]*|[0-9][0-9_]*\\.[0-9][0-9_]*`;
const DECIMAL_RE = `${SIZE_RE}'[sS]?[dD]([0-9][0-9_]*|[xX]_*|[zZ?]_*)|[0-9][0-9_]*`;
const NUMBER_RE_VERILOG = `(${OCTAL_RE})|(${BINARY_RE})|(${HEX_RE})|(${REAL_RE})|(${DECIMAL_RE})`;

function posCmp(la, ca, lb, cb) {
  if (la !== lb) return la < lb;
  return ca < cb;
}

let store = null;

function applyVHDLHighlight(lang) {
  // Modified from the tokenizer from highlight.js
  monaco.languages.setMonarchTokensProvider(lang, {
    kw: [
      'abs', 'access', 'after', 'alias', 'all', 'and', 'architecture', 'array', 'assert', 'assume', 'assume_guarantee', 'attribute',
      'begin', 'block', 'body', 'buffer', 'bus', 'case', 'component', 'configuration', 'constant', 'context', 'cover', 'disconnect',
      'downto', 'default', 'else', 'elsif', 'end', 'entity', 'exit', 'fairness', 'file', 'for', 'force', 'function', 'generate',
      'generic', 'group', 'guarded', 'if', 'impure', 'in', 'inertial', 'inout', 'is', 'label', 'library', 'linkage', 'literal',
      'loop', 'map', 'mod', 'nand', 'new', 'next', 'nor', 'not', 'null', 'of', 'on', 'open', 'or', 'others', 'out', 'package', 'parameter',
      'postponed', 'procedure', 'process', 'property', 'protected', 'pure', 'range', 'record', 'register', 'reject',
      'release', 'rem', 'report', 'restrict', 'restrict_guarantee', 'return', 'rol', 'ror', 'select', 'sequence',
      'severity', 'shared', 'signal', 'sla', 'sll', 'sra', 'srl', 'strong', 'subtype', 'then', 'to', 'transport', 'type',
      'unaffected', 'units', 'until', 'use', 'variable', 'view', 'vmode', 'vprop', 'vunit', 'wait', 'when', 'while', 'with', 'xnor', 'xor',
    ],

    type: [
      'boolean', 'bit', 'character',
      'integer', 'time', 'delay_length', 'natural', 'positive',
      'string', 'bit_vector', 'file_open_kind', 'file_open_status',
      'std_logic', 'std_logic_vector', 'unsigned', 'signed', 'boolean_vector', 'integer_vector',
      'std_ulogic', 'std_ulogic_vector', 'unresolved_unsigned', 'u_unsigned', 'unresolved_signed', 'u_signed',
      'real_vector', 'time_vector',
    ],

    lit: [
      'false', 'true', 'note', 'warning', 'error', 'failure', 'line', 'text', 'side', 'width', 'CR'
    ],

    tokenizer: {
      root: [
        [/[a-z_$][\w$]*/, {
          cases: {
            '@kw': 'keyword',
            '@type': 'type.identifier',
            '@lit': 'keyword',
            '@default': 'identifier',
          },
        }],

        [/--.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        [new RegExp(NUMBER_RE), 'number'],

        [LOGIC_RE, 'string'],
        [/([BOX])("[0-9A-F_]*")/, ['type.identifier', 'string']],
        [/"[^"]*"/, 'string'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        ["\\*/", 'comment', '@pop'],
        [/[\/*]/, 'comment'],
      ],
    }
  });

}

function applyVerilogHighlight(lang) {
  // Modified from the tokenizer from highlight.js
  monaco.languages.setMonarchTokensProvider(lang, {
    kw: [
      'accept_on', 'alias', 'always', 'always_comb', 'always_ff', 'always_latch', 'and',
      'assert', 'assign', 'assume', 'automatic', 'before', 'begin', 'bind', 'bins', 'binsof',
      'break', 'buf', 'bufif0', 'bufif1', 'case', 'casex', 'casez', 'cell',
      'chandle', 'checker', 'class', 'clocking', 'cmos', 'config', 'const', 'constraint',
      'context', 'continue', 'cover', 'covergroup', 'coverpoint', 'cross', 'deassign',
      'default', 'defparam', 'design', 'disable', 'dist', 'do', 'edge', 'else', 'end', 'endcase',
      'endchecker', 'endclass', 'endclocking', 'endconfig', 'endfunction', 'endgenerate',
      'endgroup', 'endinterface', 'endmodule', 'endpackage', 'endprimitive',
      'endprogram', 'endproperty', 'endspecity', 'endsequence', 'endtable', 'endtask', 'enum',
      'event', 'eventually', 'expect', 'export', 'extends', 'extern', 'final', 'first_match', 'for',
      'force', 'foreach', 'forever', 'fork', 'forkjoin', 'function', 'generate', 'genvar', 'global',
      'highz0', 'highz1', 'if', 'iff', 'ifnone', 'ignore_bins', 'illegal_bins', 'implements', 'implies', 'import',
      'incdir', 'include', 'initial', 'inout', 'input', 'inside', 'instance', 'interconnect', 'interface', 'intersect', 'join',
      'join_any', 'join_none', 'large', 'let', 'liblist', 'library', 'local', 'localparam', 'macromodule', 'matches', 'medium',
      'modport', 'module', 'nand', 'negedge', 'nettype', 'new', 'nexttime', 'nmos', 'nor', 'noshowcancelled', 'not', 'notif0',
      'notif1', 'null', 'or', 'output', 'package', 'packed', 'parameter', 'pmos', 'posedge', 'primitive', 'priority', 'program',
      'property', 'protected', 'pull0', 'pull1', 'pulldown', 'pullup', 'pulsestyle_ondetect', 'pulsestyle_onevent', 'pure', 'rand',
      'randc', 'randcase', 'randsequence', 'rcmos', 'real', 'realtime', 'ref', 'reject_on', 'release', 'repeat', 'restrict',
      'return', 'rnmos', 'rpmos', 'rtran', 'rtranif0', 'rtranif1', 's_always', 's_eventually', 's_nexttime', 's_until', 's_until_with',
      'scalared', 'sequence', 'shortint', 'shortreal', 'showcancelled', 'signed', 'small', 'soft', 'solve', 'specify', 'specparam', 'static',
      'strong', 'strong0', 'strong1', 'super', 'supply0', 'supply1', 'sync_accept_on', 'sync_reject_on', 'table',
      'tagged', 'task', 'this', 'throughout', 'time', 'timeprecision', 'timeunit', 'tran',
      'tranif0', 'tranif1', 'tri', 'tri0', 'tri1', 'triand', 'trior', 'trireg', 'type', 'typedef',
      'union', 'unique', 'unique0', 'unsigned', 'until', 'until_with', 'untyped', 'use',
      'uwire', 'var', 'vectored', 'virtual', 'void', 'wait', 'wait_order', 'wand', 'weak', 'weak0', 'weak1', 'while',
      'wildcard', 'wire', 'with', 'within', 'wor', 'xnor', 'xor'
    ],

    type: [
      'bit', 'byte', 'int', 'integer', 'logic', 'longint', 'reg', 'string', 'struct'
    ],

    lit: [
      'false', 'true', 'note', 'warning', 'error', 'failure', 'line', 'text', 'side', 'width', 'CR'
    ],

    tokenizer: {
      root: [
        [/[a-z_$][\w$]*/, {
          cases: {
            '@kw': 'keyword',
            '@type': 'type.identifier',
            '@lit': 'keyword',
            '@default': 'identifier',
          },
        }],

        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],

        [new RegExp(NUMBER_RE_VERILOG), 'number'],

        [LOGIC_RE, 'string'],
        [/([BOX])("[0-9A-F_]*")/, ['type.identifier', 'string']],
        [/"[^"]*"/, 'string'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        ["\\*/", 'comment', '@pop'],
        [/[\/*]/, 'comment'],
      ],
    }
  });

}

export default _store => {
  store = _store;

  monaco.languages.register({ id: 'vhdl' });
  monaco.languages.register({ id: 'vhdl-ro' }); // Readonly vhdl, no codelens
  monaco.languages.register({ id: 'verilog' });
  monaco.languages.register({ id: 'verilog-ro' }); // Readonly verilog, no codelens

  applyVHDLHighlight('vhdl');
  applyVHDLHighlight('vhdl-ro');
  applyVerilogHighlight('verilog');
  applyVerilogHighlight('verilog-ro');

  let hoverProvider = {
    provideHover: (model, pos) => {
      const line = pos.lineNumber - 1;
      const char = pos.column - 1;

      const { analysis } = store.getState();
      if (!analysis) return;
      const { diagnostics } = analysis;

      const msgs = [];

      let fromLine = null, fromChar = null, toLine = null, toChar = null;

      for (const d of diagnostics) {
        const pos = d.pos;
        if (!posCmp(line, char, pos.from_line, pos.from_char) && !posCmp(pos.to_line, pos.to_char, line, char)) {
          const severity = d.severity[0].toUpperCase() + d.severity.slice(1);
          msgs.push(`**${severity}**: ${d.msg}`);

          if (fromLine === null || posCmp(pos.from_line, pos.from_char, fromLine, fromChar)) {
            fromLine = pos.from_line;
            fromChar = pos.from_char;
          }

          if (toLine === null || posCmp(toLine, toChar, pos.to_line, pos.to_char)) {
            toLine = pos.to_line;
            toChar = pos.to_char;
          }
        }
      }

      if (msgs.length === 0) return null;
      const result = {
        range: new monaco.Range(
          fromLine + 1,
          fromChar + 1,
          toLine + 1,
          toChar + 1,
        ),
        contents: msgs.map(e => ({ value: e, isTrusted: true })),
      };
      return result;
    }
  };
  monaco.languages.registerHoverProvider('vhdl', hoverProvider);
  monaco.languages.registerHoverProvider('verilog', hoverProvider);
};

export function registerCodeLens(cmds) {
  const { asTop, assignPin } = cmds;

  let boardConfig = BOARDS[DEFAULT_BOARD];

  const codeLensProvider = {
    onDidChange: cb => {
      let { analysis: lastAnalysis, constraints: lastConstraints, board: lastBoard } = store.getState();

      const unsubscribe = store.subscribe(() => {
        const { analysis, constraints } = store.getState();
        let changed = false;
        // Analysis is returned from WASM call, so weak comparasion should work here
        if (analysis !== lastAnalysis) {
          console.log('Analysis changed');
          lastAnalysis = analysis;
          changed = true;
        }

        if (constraints !== lastConstraints) {
          console.log('Constraints changed');
          lastConstraints = constraints;
          changed = true;
        }

        boardConfig = BOARDS[constraints.board];

        if (changed)
          cb(codeLensProvider);
      });

      return { dispose: unsubscribe };
    },

    provideCodeLenses: (_model, _token) => {
      const { analysis, constraints } = store.getState();

      if (!analysis) return { lenses: [], dispose: () => { } };

      const lenses = analysis.entities.map((ent, idx) => {
        return {
          range: {
            startLineNumber: ent.decl.from_line + 1,
            startColumn: 1,
            endLineNumber: ent.decl.from_line + 2,
            endColumn: 1,
          },
          id: `set-as-top:${ent.name}`,
          command: {
            title: 'Set as top',
            id: asTop,
            arguments: [ent],
          },
        };
      });


      if (analysis.top !== null) {
        const topIdx = analysis.top;
        lenses[topIdx].command = {
          title: 'Top entity'
        };

        for (const signal of analysis.entities[topIdx].signals) {
          function push(name, params, isStandalone) {
            let title;
            if (isStandalone) {
              const assigned = constraints.signals.get(name);
              const spec = boardConfig?.pins[assigned];
              title = assigned !== undefined ? `Assigned to pin ${ spec?.label || assigned }` : `Assign pin for ${name}`;
            } else {
              title = `Assign pins for ${name}`;
            }

            lenses.push({
              range: {
                startLineNumber: signal.pos.from_line + 1,
                startColumn: signal.pos.from_char + 1,
                endLineNumber: signal.pos.to_line + 1,
                endColumn: signal.pos.to_char + 1,
              },
              id: `assign-pin:${name}`,
              command: {
                title,
                id: params === null ? undefined : assignPin,
                arguments: params,
              },
            });
          }

          if (signal.arity === null) {
            push(signal.name, [signal, null], true);
          } else {
            push(signal.name, [signal, signal.arity.from], false);
          }
        }
      }


      return { lenses, dispose: () => { } };
    }
  };

  const disposableVHDL = monaco.languages.registerCodeLensProvider('vhdl', codeLensProvider);
  const disposableVerilog = monaco.languages.registerCodeLensProvider('verilog', codeLensProvider);

  return () => { disposableVHDL.dispose(); disposableVerilog.dispose(); };
}
