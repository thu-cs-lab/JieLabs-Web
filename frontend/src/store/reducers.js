import { TYPES } from './actions';

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

export function signals(state = { top: null, signals: new Map() }, action) {
  if(action.type === TYPES.ASSIGN_TOP) {
    return { top: action.top, signals: new Map() };
  } else if(action.type === TYPES.ASSIGN_PIN) {
    const { signal, pin } = action;

    return {
      top: state.top,
      signals: state.signals.filter((_, v) => v !== pin).set(signal, pin),
    };
  }

  return state;
}
