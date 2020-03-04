import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';
import pako from 'pako';
import { CSSTransition } from 'react-transition-group';
import Monaco from 'react-monaco-editor';

import { HARD_LOGOUT, BOARDS, TAR_FILENAMES } from './config';
import { BOARD_STATUS, init, logout, programBitstream, loadMoreBuilds } from './store/actions';
import { untar } from './util';

import Login from './routes/Login';
import Workspace from './routes/Workspace';
import Icon from './comps/Icon';
import Tooltip from './comps/Tooltip';

export default React.memo(() => {
  const dispatch = useDispatch();
  const history = useHistory();

  const [loading, setLoading] = useState(true);

  const boardTmpl = useSelector(state => state.constraints.board);
  const boardTmplName = BOARDS[boardTmpl].name;

  const latestBuilds = useSelector(state => state.builds.list);
  const buildsEnded = useSelector(state => state.builds.ended);

  const hasBoard = useSelector(store => store.board.status === BOARD_STATUS.CONNECTED);

  useEffect(() => {
    dispatch(init()).then(restored => {;
      if(!restored) history.push('/login');
      setLoading(false);
    });
  }, [dispatch, history]);

  const logined = useSelector(store => store.user !== null);
  const doLogout = useCallback(async () => {
    await dispatch(logout())

    if(HARD_LOGOUT) {
      window.location.href = '/login';
    } else {
      // FIXME: routing guard
      history.push('/login');
    }
  }, [dispatch, history]);

  function getStatusInd(status) {
    if(status === null)
      return <div className="latest-build-pending"></div>;
    if(status === 'Compilation Success')
      return <Icon className="latest-build-success">done</Icon>
    return <Icon className="latest-build-failed">close</Icon>
  }

  const [detail, setDetail] = useState(null);
  const currentLoading = useRef(null);

  const showDetail = useCallback(e => {
    console.log(e);
    currentLoading.current = { basic: e, log: null, code: null, assignments: null };
    setDetail(currentLoading.current);

    // Load src
    async function loadSrc() {
      const resp = await fetch(e.src);
      const buf = await resp.arrayBuffer();
      const arr = new Uint8Array(buf);

      if(currentLoading.current?.basic.id !== e.id) return;

      const content = untar(arr);

      // Get source
      const decoder = new TextDecoder();
      const sourceRaw = content.find(e => e.name === TAR_FILENAMES.source).content;
      const source = decoder.decode(sourceRaw);
      currentLoading.current = {
        ...currentLoading.current,
        code: source,
      };
      setDetail(currentLoading.current);
    }

    // Load dst
    async function loadDst() {
      const resp = await fetch(e.dst);
      const buf = await resp.arrayBuffer();
      const inflated = pako.inflate(buf);

      const content = untar(inflated);
      if(currentLoading.current?.basic.id !== e.id) return;
    }

    loadSrc();

    if(e.dst)
      loadDst();
    // TODO: mark as not available
  }, [detail]);

  const dismissDetail = useCallback(() => {
    setDetail(null);
    currentLoading.current = null;
  }, []);

  if(loading)
    return <div className="container loading"></div>;

  return <div className="container">
    <header>
      <div className="brand"><strong>Jie</strong>Labs</div>

      <div className={cn("stub", { 'stub-disabled': !logined })}>
        <div className="stub-text">
          { logined ? boardTmplName : 'Login' }
        </div>
        <span className="stub-caret">
        </span>
      </div>

      <div className="spanner"></div>

      <div className={cn("shifter", { shifted: !logined })}>
        <div className="latest-build">
          { latestBuilds.size > 0 ? (
            <div className="latest-build-info">
              <div className="latest-build-id">
                <small>#</small><strong>{ latestBuilds.get(0).id }</strong>
              </div>
              <div className="latest-build-status">
                { getStatusInd(latestBuilds.get(0).status) }
              </div>
            </div>
          ) : (
            <div className="latest-build-info">
              <div className="latest-build-id latest-build-empty">
                N/A
              </div>
            </div>
          )}
          <div className="latest-build-hint">
            Latest build<span className="latest-build-nonsense">s</span>
            <Icon className="latest-build-aux">more_vert</Icon>
          </div>

          <div className="build-list">
            { latestBuilds.map(e => (
              <div key={e.id} className={cn("build-list-entry", { 'build-list-pending': e.status === null })}>
                <div className="build-list-id"><small>#</small><strong>{e.id}</strong></div>
                <div className="build-list-sep">/</div>
                <div className={cn("build-list-status", { 'build-list-status-error': e.status === 'Compilation Failed' })}>
                  { e.status || 'Compiling...' }
                </div>
                { e.status === 'Compilation Success' && (
                  <>
                    <div className="build-list-sep">/</div>
                    <Tooltip tooltip={(!hasBoard) && 'FPGA disconnected'} gap={true}>
                      <Icon
                        className={cn("build-list-action", { 'build-list-action-disabled': !hasBoard })}
                        onClick={() => {
                          if(e.status === 'Compilation Success')
                            dispatch(programBitstream(e.id));
                        }}
                      >cloud_download</Icon>
                    </Tooltip>
                  </>
                )}
                <div className="build-list-sep">/</div>
                <Icon
                  className="build-list-action"
                  onClick={() => showDetail(e)}
                >more_vert</Icon>
              </div>
            ))}

            { latestBuilds.size === 0 ? (
              <div className="build-list-placeholder">
                The World is Big and the panda sit alone
              </div>
            ) : (
              !buildsEnded && (
                <div className="build-list-end" onClick={() => dispatch(loadMoreBuilds())}>
                  Load more...
                </div>
              )
            )}
          </div>
        </div>

        <div className="logout" onClick={doLogout}>
          <Icon>logout</Icon>
        </div>
      </div>
    </header>

    <Switch>
      <Route path="/login" exact>
        <Login />
      </Route>
      <Route path="/" exact>
        <Workspace />
      </Route>
    </Switch>

    { detail !== null && (
      <CSSTransition
        timeout={500}
        classNames="fade"
      >
        <div className="backdrop fullscreen">
          <div className="dialog expanded build-detail-dialog">
            <div className="build-detail-header">
              <div className="hint">Build detail</div>
              <div className="dialog-title monospace">Build #{detail.basic.id}</div>
            </div>
            <div className="build-detail">
              <div className="build-detail-pane">
                <div className="loading"></div>
              </div>

              <div className="build-detail-pane">
                { detail.code ? (
                  <Monaco
                    options={{
                      theme: 'vs-dark',
                      language: 'vhdl-ro',
                      readonly: true,
                    }}
                    value={detail.code}
                  />
                ) : <div className="loading"></div> }
              </div>
            </div>
          </div>
        </div>
      </CSSTransition>
    )}
  </div>;
})
