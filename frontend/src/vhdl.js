import * as monaco from 'monaco-editor';

/* eslint-disable no-useless-concat,no-useless-escape */

const INTEGER_RE = '\\d(_|\\d)*';
const EXPONENT_RE = '[eE][-+]?' + INTEGER_RE;
const DECIMAL_LITERAL_RE = INTEGER_RE + '(\\.' + INTEGER_RE + ')?' + '(' + EXPONENT_RE + ')?';
const BASED_INTEGER_RE = '\\w+';
const BASED_LITERAL_RE = INTEGER_RE + '#' + BASED_INTEGER_RE + '(\\.' + BASED_INTEGER_RE + ')?' + '#' + '(' + EXPONENT_RE + ')?';

const NUMBER_RE = '\\b(' + BASED_LITERAL_RE + '|' + DECIMAL_LITERAL_RE + ')';

const LOGIC_RE = /'[UX01ZWLH-]'/;

let store = null;

export default _store => {
  store = _store;

  monaco.languages.register({ id: 'vhdl' });

  // Modified from the tokenizer from highlight.js
  monaco.languages.setMonarchTokensProvider('vhdl', {
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
        [/[^\/*]+/, 'comment' ],
        ["\\*/",    'comment', '@pop'],
        [/[\/*]/,   'comment' ],
      ],
    }
  });
};

export function registerCodeLens(cmds) {
  const { asTop, assignPin } = cmds;

  const codeLensProvider = {
    onDidChange: cb => {
      let lastAnalysis = null;
      let lastSignals = null;

      const unsubscribe = store.subscribe(() => {
        const { analysis, signals } = store.getState();
        let changed = false;
        // Analysis is returned from WASM call, so weak comparasion should work here
        if(analysis !== lastAnalysis) {
          lastAnalysis = analysis;
          changed = true;
        }

        if(signals !== lastSignals) {
          lastSignals = signals;
          changed = true;
        }

        if(changed)
          cb(codeLensProvider);
      });

      return { dispose: unsubscribe };
    },

    provideCodeLenses: (_model, _token) => {
      const { analysis } = store.getState();

      if(!analysis) return { lenses: [], dispose: () => {} };

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


      if(analysis.top !== null) {
        // TODO: Oops, typo in wasm lib.
        const topIdx = analysis.top - 1;
        lenses[topIdx].command = {
          title: 'Top entity'
        };

        for(const signal of analysis.entities[topIdx].signals) {
          lenses.push({
            range: {
              startLineNumber: signal.pos.from_line + 1,
              startColumn: signal.pos.from_char + 1,
              endLineNumber: signal.pos.to_line + 1,
              endColumn: signal.pos.to_char + 1,
            },
            id: `assign-pin:${signal.name}`,
            command: {
              title: `Assign pin for ${signal.name}`,
              id: assignPin,
              arguments: [signal],
            },
          });
        }
      }


      return { lenses, dispose: () => {} };
    }
  };

  monaco.languages.registerCodeLensProvider('vhdl', codeLensProvider);
}
