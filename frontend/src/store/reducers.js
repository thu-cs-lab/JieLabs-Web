import { SET_USER } from './actions';

export function user(state = null, action) {
  if(action.action === SET_USER)
    return action.user;
  return state;
}
