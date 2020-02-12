import { get, post } from '../util';

export const TYPES = {
  SET_USER: Symbol('SET_USER'),
};

export function setUser(user) {
  return {
    type: TYPES.SET_USER,
    user,
  };
}

export function login(user, pass) {
  // TODO: show blocker
  return async (dispatch) => {
    try {
      const data = await post('/api/session', {
        user_name: user,
        password: pass,
      });

      if(!data.login) return false;

      dispatch(setUser(data));

      return true;
    } catch(e) {
      console.error(e);
      return false;
    }
  }
}

export function restore() {
  // TODO: show blocker
  return async (dispatch) => {
    try {
      const data = await get('/api/session');

      if(!data.login) return false;

      dispatch(setUser(data));

      return true;
    } catch(e) {
      console.error(e);
      return false;
    }
  }
}

export function logout() {
  // TODO: show blocker
  return async (dispatch) => {
    try {
      const data = await get('/api/session', 'DELETE');
      dispatch(setUser(null));
      return true;
    } catch(e) {
      console.error(e);
      return false;
    }
  }
}
