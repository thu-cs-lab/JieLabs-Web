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
