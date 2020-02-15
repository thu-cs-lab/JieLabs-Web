import { get, post, putS3, createTarFile } from '../util';

export const TYPES = {
  SET_USER: Symbol('SET_USER'),
  SET_BUILD: Symbol('SET_BUILD'),
};

export function setUser(user) {
  return {
    type: TYPES.SET_USER,
    user,
  };
}

export function setBuild(build) {
  return {
    type: TYPES.SET_BUILD,
    build,
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

export function submitBuild(code) {
  return async (dispatch, getState) => {
    try {
      let { build } = getState();
      if (build && build.intervalID) {
        clearInterval(build.intervalID);
      }

      const data = await get('/api/file/upload');
      const uuid = data.uuid;
      const url = data.url;

      let tar = createTarFile('src/mod_top.v', code);
      await putS3(url, tar);
      const result = await post('/api/task/build', {source: uuid});
      let intervalID = null;
      intervalID = setInterval(async () => {
        const info = await get(`/api/task/get/${result}`);
        if (info.status) {
          clearInterval(intervalID);
          dispatch(setBuild({
            job_id: result,
            isPolling: false,
            intervalID: null,
          }));
        }
      }, 3000);

      dispatch(setBuild({
        job_id: result,
        isPolling: true,
        intervalID,
      }));
      return true;
    } catch(e) {
      console.error(e);
      return false;
    }
  }
}