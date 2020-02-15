import { TYPES } from './actions';

export function user(state = null, action) {
  if(action.type === TYPES.SET_USER)
    return action.user;
  return state;
}

export function build(state = null, action) {
  if(action.type === TYPES.SET_BUILD)
    return action.build;
  return state;
}