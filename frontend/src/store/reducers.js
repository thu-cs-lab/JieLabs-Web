import { TYPES, BOARD_STATUS } from './actions';
import { Map, List } from 'immutable';
import { DEFAULT_BOARD, BOARDS } from '../config';
import { SIGNAL } from '../blocks';

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

export function builds(state = { list: List(), ended: false }, action) {
  if(action.type === TYPES.LOAD_BUILDS)
    return { list: action.list, ended: action.ended };
  if(action.type === TYPES.PUT_BUILD) {
    const { build } = action;
    const { id } = build;
    if(!id) throw new Error('Build missing field id');

    const { list, ended } = state;

    const idx = list.findIndex(e => e.id === id);
    if(idx === -1) return { list: list.unshift(build), ended };
    else return { list: list.set(idx, build), ended };
  }
  return state;
}

export function activeBuild(state = null, action) {
  if(action.type === TYPES.SET_ACTIVE_BUILD)
    return action.build;
  return state;
}

export function board(state = { status: BOARD_STATUS.DISCONNECTED, websocket: null }, action) {
  if(action.type === TYPES.SET_BOARD)
    return action.board;
  if(action.type === TYPES.UPDATE_BOARD)
    return {
      ...state,
      status: action.status,
    };
  return state;
}

export function constraints(state = { board: DEFAULT_BOARD, top: null, signals: new Map() }, action) {
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

    const entity = analysis.entities[analysis.top];
    const board = BOARDS[state.board];

    let mapper = new Map();
    for(const signal of entity.signals) mapper = mapper.set(signal.name, signal);

    return {
      board: state.board,
      top: state.top,

      signals: state.signals.filter((v, k) => {
        const regex = /^([^[\]]+)(\[([0-9]+)\])?$/;
        // Asserts to match
        const [, base,, subscript] = k.match(regex);
        const lookup = mapper.get(base);
        if(!lookup) return false;
        const { dir, arity } = lookup;
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

export function clock(state = null, action) {
  if(action.type === TYPES.SET_CLOCK)
    return action.clock;
  return state;
}

export function input(state = null, action) {
  if(action.type === TYPES.UPDATE_INPUT) {
    const { data } = action;
    return data.split('').map(e => e === '1' ? SIGNAL.H : SIGNAL.L);
  }

  return state;
}

export function help(state = null, action) {
  if(action.type === TYPES.STEP_HELP)
    return state + 1;
  if(action.type === TYPES.UNSTEP_HELP)
    return state === 0 ? 0 : state - 1;
  else if(action.type === TYPES.END_HELP)
    return null;
  else if(action.type === TYPES.START_HELP)
    return 0;
  return state;
}
