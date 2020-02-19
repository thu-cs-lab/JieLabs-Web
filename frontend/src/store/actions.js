import { get, post, putS3, createTarFile } from '../util';
import { WS_BACKEND, CODE_ANALYSE_DEBOUNCE } from '../config';

export const TYPES = {
  SET_USER: Symbol('SET_USER'),
  LOAD_LIB: Symbol('LOAD_LIB'),
  SET_CODE: Symbol('SET_CODE'),
  SET_ANALYSIS: Symbol('SET_ANALYSIS'),
  SET_BUILD: Symbol('SET_BUILD'),
  SET_BOARD: Symbol('SET_BOARD'),
  ASSIGN_TOP: Symbol('ASSIGN_TOP'),
  ASSIGN_PIN: Symbol('ASSIGN_PIN'),
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

export function setCode(code) {
  return {
    type: TYPES.SET_CODE,
    code,
  };
}

export function setAnalysis(analysis) {
  return {
    type: TYPES.SET_ANALYSIS,
    analysis,
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

export function assignTop(top) {
  return {
    type: TYPES.ASSIGN_TOP,
    top,
  };
}

export function assignPin(signal, pin) {
  return {
    type: TYPES.ASSIGN_PIN,
    signal, pin,
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
  return async (dispatch, getState) => {
    const lib = await import('jielabs_lib');
    dispatch(loadLib(lib));

    const { code } = getState();

    const analysis = lib.parse(code);
    dispatch(setAnalysis(analysis));
  }
}

export function init() {
  return async (dispatch) => {
    const restored = dispatch(restore());
    const libLoaded = dispatch(initLib());

    const [logined,] = await Promise.all([restored, libLoaded]);
    return logined;
  }
}

export function submitBuild() {
  return async (dispatch, getState) => {
    try {
      let { build, code } = getState();
      if (build && build.intervalID) {
        clearInterval(build.intervalID);
      }

      const data = await get('/api/file/upload');
      const uuid = data.uuid;
      const url = data.url;

      let tar = createTarFile([{ name: 'src/mod_top.vhd', body: code },
      { name: 'src/mod_top.qsf', body: 'set_location_assignment PIN_N1 -to M_nRESET' }]);
      await putS3(url, tar);
      const result = await post('/api/task/build', { source: uuid });
      let intervalID = null;
      intervalID = setInterval(async () => {
        const info = await get(`/api/task/get/${result}`);
        if (info.status) {
          clearInterval(intervalID);
          dispatch(setBuild({
            jobID: result,
            isPolling: false,
            buildInfo: info,
          }));
        }
      }, 3000);

      dispatch(setBuild({
        jobID: result,
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

export function connectToBoard() {
  return async (dispatch, getState) => {
    try {
      let { board } = getState();
      let websocket = null;
      if (board && board.websocket) {
        websocket = board.websocket;
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send('{"RequestForBoard":""}');
        } else {
          websocket.close();
          websocket = null;
        }
      }

      if (!websocket) {
        websocket = new WebSocket(`${WS_BACKEND}/api/ws_user`);
        websocket.onopen = () => {
          websocket.send('{"RequestForBoard":""}');
        };
        websocket.onmessage = (message) => {
          let msg = JSON.parse(message.data);
          console.log(msg);
          if (msg["BoardAllocateResult"]) {
            websocket.send('{"ToBoard":{"SubscribeIOChange":""}}');
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
        };
        dispatch(setBoard({
          websocket,
          hasBoard: false,
        }));
      }

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export function programBitstream() {
  return async (dispatch, getState) => {
    try {
      let { board, build } = getState();
      if (board && board.websocket) {
        let jobID = build.jobID;
        board.websocket.send(`{"ProgramBitstream":${jobID}}`);
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

let debouncer = null;

export function updateCode(code) {
  return async (dispatch, getState) => {
    // TODO: debounce and run lang server checks

    dispatch(setCode(code));

    if (debouncer !== null) {
      clearTimeout(debouncer);
    }

    debouncer = setTimeout(() => {
      debouncer = null;

      let { lib, code: curCode, signals } = getState();
      if (!lib) return;

      if (curCode !== code) {
        // Raced between clearTimeout and setCode
        return;
      }

      const analysis = lib.parse(code, signals.top);
      dispatch(setAnalysis(analysis));
    }, CODE_ANALYSE_DEBOUNCE);
  }
}

export function updateTop(top) {
  return async (dispatch, getState) => {
    // Immediately run analysis
    clearTimeout(debouncer);
    debouncer = null;

    const { code, lib } = getState();

    dispatch(assignTop(top));
    if (!lib) return;

    const analysis = lib.parse(code, top);
    dispatch(setAnalysis(analysis));
  }
}
