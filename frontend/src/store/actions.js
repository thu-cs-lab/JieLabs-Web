import { get, post, putS3, createTarFile } from '../util';
import { WS_BACKEND } from '../config';

export const TYPES = {
  SET_USER: Symbol('SET_USER'),
  LOAD_LIB: Symbol('LOAD_LIB'),
  SET_BUILD: Symbol('SET_BUILD'),
  SET_BOARD: Symbol('SET_BOARD'),
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

export function setBuild(build) {
  return {
    type: TYPES.SET_BUILD,
    build,
  };
}

export function setBoard(board) {
  return {
    type: TYPES.SET_BOARD,
    board,
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

      if (!data.login) return false;

      dispatch(setUser(data));

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export function restore() {
  return async dispatch => {
    try {
      const data = await get('/api/session');

      if (!data.login) return false;

      dispatch(setUser(data));

      return true;
    } catch (e) {
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
    } catch (e) {
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
      const result = await post('/api/task/build', { source: uuid });
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
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export function connectToBoard(code) {
  return async (dispatch, getState) => {
    try {
      let { board } = getState();
      let websocket = null;
      if (board && board.websocket) {
        websocket = board.websocket;
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send('{"RequestForBoard":""}');
        }
      } else {
        let websocket = new WebSocket(`${WS_BACKEND}/api/ws_user`);
        websocket.onopen = () => {
          websocket.send('{"RequestForBoard":""}');
        };
        websocket.onmessage = (message) => {
          let msg = JSON.parse(message.data);
          console.log(msg);
          if (msg["BoardAllocateResult"]) {
            dispatch(setBoard({
              websocket,
              hasBoard: true,
            }));
          } else if (msg["BoardDisconnected"] !== undefined) {
            dispatch(setBoard({
              websocket,
              hasBoard: false,
            }));
          }
        };
        websocket.onclose = () => {
          dispatch(setBoard({
            hasBoard: false,
          }));
        }
      }

      dispatch(setBoard({
        websocket,
        hasBoard: false,
      }));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
