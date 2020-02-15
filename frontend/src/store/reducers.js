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
