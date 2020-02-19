import { TYPES } from './actions';
import { Map } from 'immutable';
import { DEFAULT_BOARD, BOARDS } from '../config';

export function user(state = null, action) {
  if(action.type === TYPES.SET_USER)
    return action.user;
  return state;
}

export function lib(state = null, action) {
  if(action.type === TYPES.LOAD_LIB)
    return action.lib;
  return state;
}

export function code(state = null, action) {
  if(action.type === TYPES.SET_CODE)
    return action.code;
  return state;
}

export function analysis(state = null, action) {
  if(action.type === TYPES.SET_ANALYSIS)
    return action.analysis;
  return state;
}

export function build(state = {}, action) {
  if(action.type === TYPES.SET_BUILD)
    return action.build;
  return state;
}

export function board(state = {}, action) {
  if(action.type === TYPES.SET_BOARD)
    return action.board;
  return state;
}

export function signals(state = { board: DEFAULT_BOARD, top: null, signals: new Map() }, action) {
  if(action.type === TYPES.SELECT_BOARD) {
    return { board: action.board, top: null, signals: new Map() }
  } else if(action.type === TYPES.ASSIGN_TOP) {
    return { board: state.board, top: action.top, signals: new Map() };
  } else if(action.type === TYPES.ASSIGN_PIN) {
    const { signal, pin } = action;
    const { board, top } = state;

    return {
      board, top,
      signals: state.signals.filter(v => v !== pin).set(signal, pin),
    };
  } else if(action.type === TYPES.SET_ANALYSIS) {
    const { analysis } = action;
    if(analysis.top === null) return state;

    const entity = analysis.entities[analysis.top-1];
    const board = BOARDS[state.board];

    let mapper = new Map();
    for(const signal of entity.signals) mapper = mapper.set(signal.name, signal);

    return {
      board: state.board,
      top: state.top,

      signals: state.signals.filter((v, k) => {
        const regex = /^([^\[\]]+)(\[([0-9]+)\])?$/;
        // Asserts to match
        const [, base,, subscript] = k.match(regex);
        const { dir, arity } = mapper.get(base);
        if(dir === undefined) return false;

        if(subscript !== undefined) {
          const numSub = Number.parseInt(subscript, 10);
          // Signal not an array
          if(arity === null)
            return false;
          if(arity.from <= arity.to && (
            arity.from > numSub ||
            arity.to < numSub
          ))
            return false;
          else if(arity.from > arity.to && (
            arity.from < numSub ||
            arity.to > numSub
          ))
            return false;
        } else {
          // Signal changed into array
          if(arity !== null)
            return false;
        }

        const spec = board.pins[v];

        if(dir === 'input' && !spec.output) return false;
        if(dir === 'output' && !spec.input) return false;

        return true;
      }),
    }
  }

  return state;
}
