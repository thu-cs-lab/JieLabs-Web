import { Map as IMap, List as IList } from 'immutable';

import { get, post, putS3, createTarFile } from '../util';
import { WS_BACKEND, CODE_ANALYSE_DEBOUNCE, BOARDS, BUILD_POLL_INTERVAL } from '../config';
import { SIGNAL } from '../blocks';

export const TYPES = {
  SET_USER: Symbol('SET_USER'),

  LOAD_LIB: Symbol('LOAD_LIB'),

  SET_CODE: Symbol('SET_CODE'),

  SET_ANALYSIS: Symbol('SET_ANALYSIS'),

  PUT_BUILD: Symbol('PUT_BUILD'),
  LOAD_BUILDS: Symbol('LOAD_BUILDS'),

  SET_BOARD: Symbol('SET_BOARD'),
  ASSIGN_TOP: Symbol('ASSIGN_TOP'),
  ASSIGN_PIN: Symbol('ASSIGN_PIN'),
  SET_CLOCK: Symbol('SET_CLOCK'),
  UPDATE_INPUT: Symbol('UPDATE_INPUT'),
};

export const BOARD_STATUS = Object.freeze({
  DISCONNECTED: Symbol("DISCONNECTED"),
  CONNECTED: Symbol("CONNECTED"),
  WAITING: Symbol("WAITING"),
});

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

export function loadBuilds(builds) {
  return {
    type: TYPES.LOAD_BUILDS,
    builds,
  };
}

export function putBuild(build) {
  return {
    type: TYPES.PUT_BUILD,
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

export function setClock(clock) {
  return {
    type: TYPES.SET_CLOCK,
    clock,
  };
}

export function updateInput(data) {
  return {
    type: TYPES.UPDATE_INPUT,
    data,
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

      dispatch(initBuilds());

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
      await get('/api/session', 'DELETE');
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

export function initBuilds() {
  return async (dispatch, getState) => {
    try {
      const builds = await get('/api/task/'); // Why hurt me so much actix router?
      const mapped = builds.jobs.map(({ id, metadata, status }) => ({
        id,
        status,
        ...JSON.parse(metadata), // directions
      }));
      dispatch(loadBuilds(IList(builds.jobs)))
      kickoffPolling(dispatch, getState); // Fire-and-fly
      return true;
    } catch(e) {
      console.error(e);
    }
  }
}
export function init() {
  return async (dispatch) => {
    const restored = dispatch(restore());
    const libLoaded = dispatch(initLib());
    const buildsLoaded = dispatch(initBuilds());

    const [logined,] = await Promise.all([restored, libLoaded, buildsLoaded]);
    return logined;
  }
}

// TODO: poll multiple simutaniously
let polling = false;
export async function kickoffPolling(dispatch, getState) {
  if(polling) return;
  polling = true;

  const { builds } = getState();
  const unfinished = builds.reverse().find(e => e.status === null);
  if(!unfinished) {
    polling = false;
    return;
  }

  const { id } = unfinished;
  const info = await get(`/api/task/get/${id}`);
  if(info.status) {
    dispatch(putBuild({
      ...unfinished,
      status: info.status,
    }));

    // Immediately check for next pending build
    polling = false;
    return await kickoffPolling(dispatch, getState);
  }

  await new Promise(resolve => setTimeout(resolve, BUILD_POLL_INTERVAL));
  polling = false;
  return await kickoffPolling(dispatch, getState);
}

export function submitBuild() {
  return async (dispatch, getState) => {
    try {
      // TODO: force an analysis update immediately
      // TODO: check for analysis errors, if there actually is a top modules, etc...

      let { build, code, signals, analysis } = getState();
      if (build && build.intervalID) {
        clearInterval(build.intervalID);
      }

      const data = await get('/api/file/upload');
      const uuid = data.uuid;
      const url = data.url;

      // Build pin assignments and directions
      //
      // direction[idx] is relative to Zync

      const topEntity = analysis.entities[analysis.top];
      const sigDirs = topEntity.signals.reduce((acc, { name, dir }) => acc.set(name, dir), new IMap());

      let directions = {};
      let assignments = "";
      const board = BOARDS[signals.board];
      for(const [sig, pin] of signals.signals.entries()) {
        const pinName = board.pins[pin].pin;
        assignments += `set_location_assignment ${pinName} -to ${sig}\n`;

        // Asserts to match
        const [base] = sig.match(/^[^\[\]]+($|\[)/)
        const dir = sigDirs.get(base);
        directions[pin] = dir === 'output' ? 'input' : 'output';
      }

      let tar = createTarFile([{ name: 'src/mod_top.vhd', body: code },
      { name: 'src/mod_top.qsf', body: assignments }]);
      await putS3(url, tar);

      const id = await post('/api/task/build', {
        source: uuid,
        metadata: JSON.stringify({
          directions,
        }),
      });

      dispatch(putBuild({
        id,
        status: null,
        directions,
      }));

      // TODO: use another action instead
      kickoffPolling(dispatch, getState); // Fire-and-forget

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export function connectToBoard() {
  return async (dispatch, getState) => {
    // TODO: enter waiting state
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
          if(msg["BoardAllocateResult"]) {
            // TODO: handles allocation fails, starts polling
            websocket.send('{"ToBoard":{"SubscribeIOChange":""}}');
            dispatch(setBoard({
              websocket,
              status: BOARD_STATUS.CONNECTED,
            }));
          } else if (msg["BoardDisconnected"] !== undefined) {
            dispatch(setBoard({
              websocket,
              status: BOARD_STATUS.DISCONNECTED,
            }));
          } else if (msg["ReportIOChange"]) {
            const { data } = msg["ReportIOChange"];
            dispatch(updateInput(data));
          }
        };

        websocket.onclose = () => {
          dispatch(setBoard({
            websocket: null,
            status: BOARD_STATUS.DISCONNECTED,
          }));
        };

        dispatch(setBoard({
          websocket,
          status: BOARD_STATUS.DISCONNECTED,
        }));
      }

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export function programBitstream(id) {
  return async (dispatch, getState) => {
    try {
      let { board, builds } = getState();
      const build = builds.find(e => e.id === id);
      if(!build || !board || !board.websocket) return false;

      const { directions } = build;

      // Build direction config
      let dirArr = [];
      let maskArr = [];

      for(const pin in directions) {
        const parsed = Number.parseInt(pin, 10);

        if(parsed >= dirArr.length) {
          dirArr.push(...Array(parsed - dirArr.length + 1).fill(0));
          maskArr.push(...Array(parsed - dirArr.length + 1).fill(0));
        }

        maskArr[parsed] = 1;
        if(directions[pin] === 'input') // Reads from FPGA
          dirArr[parsed] = 1;
          
      }

      const dir = dirArr.map(e => e.toString()).join('');
      const mask = maskArr.map(e => e.toString()).join('');

      board.websocket.send(JSON.stringify({
        ToBoard: {
          SetIODirection: {
            data: dir,
            mask,
          },
        },
      }));

      board.websocket.send(`{"ProgramBitstream":${id}}`);

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

/**
 * Global timeout handle for merging multiple synchronous IO updates
 */
let notifMerger = null;
let notifSet = [];

export function setOutput(idx, value) {
  return async (dispatch, getState) => {
    console.log("OUTPUT: ", idx, value);
    if(notifMerger !== null) clearTimeout(notifMerger);
    else notifSet = [];

    notifSet[idx] = value; // JS arrays are sparse

    notifMerger = setTimeout(() => {
      const totLen = notifSet.length;
      const dataArr = Array(totLen).fill(0);
      const maskArr = Array(totLen).fill(0);

      notifSet.forEach((sig, idx) => {
        if(sig === SIGNAL.H) {
          dataArr[idx] = 1;
          maskArr[idx] = 1;
        } else if(sig === SIGNAL.L) {
          maskArr[idx] = 1;
        }
      });

      const data = dataArr.map(e => e.toString()).join('');
      const mask = maskArr.map(e => e.toString()).join('');

      notifMerger = null;
      notifSet = [];

      const { board } = getState();

      if(board.status !== BOARD_STATUS.CONNECTED) return;

      board.websocket.send(JSON.stringify({
        ToBoard: {
          SetIOOutput: {
            mask, data,
          },
        },
      }));
    });
  }
}

/**
 * Code update debouncer
 */
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

