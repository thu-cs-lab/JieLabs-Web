import { get, post } from '../util';

export const TYPES = {
  SET_USER: Symbol('SET_USER'),
  LOAD_LIB: Symbol('LOAD_LIB'),
};

export function setUser(user) {
  return {
    type: TYPES.SET_USER,
    user,
  };
}

export function loadLib(lib) {
  return {
    type: TYPES.LOAD_LIB,
    lib,
  };
}

export function login(user, pass) {
  // TODO: show blocker
  return async dispatch => {
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
  return async dispatch => {
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
  return async dispatch => {
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

export function initLib() {
  return async dispatch => {
    const lib = await import('jielabs_lib');
    dispatch(loadLib(lib));
  }
}

export function init() {
  return async (dispatch) => {
    const restored = dispatch(restore());
    const libLoaded = dispatch(initLib());

    const [logined, ] = await Promise.all([restored, libLoaded]);
    return logined;
  }
}
