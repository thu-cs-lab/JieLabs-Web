import { TYPES } from './actions';
import { Map } from 'immutable';
import { DEFAULT_BOARD } from '../config';

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
      signals: state.signals.filter((_, v) => v !== pin).set(signal, pin),
    };
  }

  return state;
}
