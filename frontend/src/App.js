import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';
import pako from 'pako';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { saveAs } from 'file-saver';

import { HARD_LOGOUT, BOARDS, TAR_FILENAMES, TIMEOUT, TIMEOUT_BUFFER } from './config';
import { BOARD_STATUS, init, logout, programBitstream, loadMoreBuilds, showSnackbar, popSnackbar, disconnectBoard } from './store/actions';
import { untar, readFileStr, formatSize, formatDuration, formatDate } from './util';

import Icon from './comps/Icon';
import Tooltip from './comps/Tooltip';
import Highlighter from './comps/Highlighter';
import HelpLayer from './HelpLayer';

const LoginLoader = import('./routes/Login');
const WorkspaceLoader = import('./routes/Workspace');
const MonacoLoader = import('./loaders/Monaco');

export const TimeoutContext = React.createContext(null);

function useLoader(loader) {
  const [Comp, setComp] = useState(null);
  useEffect(() => {
    loader.then(mod => {
      setComp(() => mod.default);
    });
  }, []);

  const Nullify = React.useMemo(() => null);

  return Comp || Nullify;
}

export default React.memo(() => {
  const dispatch = useDispatch();
  const history = useHistory();

  const [loading, setLoading] = useState(true);

  const boardTmpl = useSelector(state => state.constraints.board);
  const boardTmplName = BOARDS[boardTmpl].name;

  const latestBuilds = useSelector(state => state.builds.list);
  const buildsEnded = useSelector(state => state.builds.ended);

  const hasBoard = useSelector(store => store.board.status === BOARD_STATUS.CONNECTED || store.board.status === BOARD_STATUS.PROGRAMMING);
  const idleBoard = useSelector(store => store.board.status === BOARD_STATUS.CONNECTED);

  const Login = useLoader(LoginLoader);
  const Workspace = useLoader(WorkspaceLoader);
  const Monaco = useLoader(MonacoLoader);

  console.log('REPAINT');

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
      window.location.href = process.env.PUBLIC_URL + '/login';
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

  const [detailTab, setDetailTab] = useState('logs');

  const showDetail = useCallback(e => {
    currentLoading.current = {
      basic: e,
      code: null,
      assignments: null,
      logs: null,
      bit: null,
      constraints: null,
    };

    setDetail(currentLoading.current);

    // Load src
    async function loadSrc() {
      const resp = await fetch(e.src);
      const buf = await resp.arrayBuffer();
      const arr = new Uint8Array(buf);

      if(currentLoading.current?.basic.id !== e.id) return;

      const content = untar(arr);

      // Get source
      currentLoading.current = {
        ...currentLoading.current,
        code: readFileStr(content, TAR_FILENAMES.source[e.lang || 'vhdl']),
        constraints: readFileStr(content, TAR_FILENAMES.constraints),
      };
      setDetail(currentLoading.current);
    }

    // Dst is loaded in a separated useEffect hook to support deferred loading

    loadSrc();
  }, [detail]);

  const detailedBuild = detail === null ? null : latestBuilds.find(e => e.id === detail.basic.id);
  useEffect(() => {
    if(!detailedBuild?.status) return;
    if(!Number.isInteger(detail?.basic.id)) return;
    if(!detail?.basic.dst) return;

    if(detailedBuild.status !== detail.basic.status) {
      // This is executed synchronously, so the id shouldn't have changed
      if(currentLoading.current.basic.id !== detailedBuild.id)
        throw new Error('Detailed build id changed!');

      currentLoading.current = {
        ...currentLoading.current,
        basic: {
          ...detailedBuild,
        },
      };

      setDetail(currentLoading.current);
    }

    // Load dst
    async function loadDst() {
      const resp = await fetch(detail.basic.dst);
      const buf = await resp.arrayBuffer();
      const inflated = pako.inflate(buf);

      const content = untar(inflated);
      if(currentLoading.current?.basic.id !== detail.basic.id) return;

      const bit = content.find(e => e.name === TAR_FILENAMES.bitstream)?.content || null;

      currentLoading.current = {
        ...currentLoading.current,
        logs: {
          stdout: readFileStr(content, TAR_FILENAMES.stdout),
          stderr: readFileStr(content, TAR_FILENAMES.stderr),
        },
        bit,
      };
      setDetail(currentLoading.current);
    }

    loadDst();

    // Fetch
  }, [detailedBuild?.status, detail?.basic.id, detail?.basic.dst]);

  const dismissDetail = useCallback(() => {
    setDetail(null);
    currentLoading.current = null;
  }, []);

  const toggleTabber = useCallback(() => {
    if(detailTab === 'code') setDetailTab('logs');
    else setDetailTab('code');
  }, [detailTab]);

  const weakBlocker = useCallback(e => {
    e.stopPropagation();
  }, []);

  const downloadBit = useCallback(e => {
    if(!detail?.bit) return;
    const blob = new Blob(detail.bit);
    saveAs(blob, `bitstream-${detail.basic.id}.bit`);
  }, [detail?.bit]);

  const snackbar = useSelector(state => state.snackbar);

  // We are not doing this in redux to keep redux's structure clean
  // TODO: cancel on server disconnect
  const timeoutRef = useRef(null);
  const timeoutWarningRef = useRef(null);
  const resetTimeout = useCallback(start => {
    let started = timeoutRef.current !== null;
    if(started) {
      const [a, b] = timeoutRef.current;
      clearTimeout(a);
      clearTimeout(b);
      timeoutRef.current = null;
    }

    if(timeoutWarningRef.current !== null) {
      timeoutWarningRef.current();
      timeoutWarningRef.current = null;
    }

    if(!started && !start) return;

    const a = setTimeout(() => {
      timeoutRef.current = null;

      if(timeoutWarningRef.current) timeoutWarningRef.current();
      timeoutWarningRef.current = dispatch(showSnackbar('FPGA timed out!'));
      dispatch(disconnectBoard());
    }, TIMEOUT);

    const b = setTimeout(() => {
      timeoutWarningRef.current = dispatch(showSnackbar('FPGA about to timeout!', 0, resetTimeout, 'NONONO'));
    }, TIMEOUT - TIMEOUT_BUFFER);

    timeoutRef.current = [a, b];
  }, []);
  const timeoutCtx = useMemo(() => ({
    reset: () => resetTimeout(false),
    start: () => resetTimeout(true),
  }), [resetTimeout]);

  if(loading) 
    return <div className="container pending"></div>;

  return <div className="container">
    <TimeoutContext.Provider value={timeoutCtx}>
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
                      <Tooltip tooltip={!hasBoard && 'FPGA disconnected'} gap={true}>
                        <Icon
                          className={cn("build-list-action", { 'build-list-action-disabled': !idleBoard })}
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
        <Route path="/login" exact component={Login} />
        <Route path="/" exact component={Workspace} />
      </Switch>

      <TransitionGroup>
        { detail !== null && (
          <CSSTransition
            timeout={500}
            classNames="fade"
          >
            <div className="backdrop centering" onMouseDown={dismissDetail}>
              <div className="dialog build-detail-dialog" onMouseDown={weakBlocker} onAnimationEnd={weakBlocker} onTransitionEnd={weakBlocker}>
                <div className="build-detail-header">
                  <div className="hint">BUILD DETAIL</div>
                  <div className="dialog-title monospace">Build #{detail.basic.id}</div>

                  <div className="build-detail-tabber-container">
                    <div className="tabber-click-zone" onClick={toggleTabber}>
                      <div className="descs">
                        <div
                          className={cn("build-detail-tab-desc", { 'desc-active': detailTab === 'logs' })}
                        >INFO</div>

                        <div
                          className={cn("build-detail-tab-desc", { 'desc-active': detailTab === 'code' })}
                        >CODE</div>
                      </div>
                      <div className="tabbers">
                        <Icon
                          className={cn("build-detail-tabber", { 'tabber-active': detailTab === 'logs' })}
                        >notes</Icon>
                        <span className="sep">/</span>
                        <Icon
                          className={cn("build-detail-tabber", { 'tabber-active': detailTab === 'code' })}
                        >code</Icon>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="build-detail">
                  <div className={cn("build-detail-pane", "padded", { 'pane-active': detailTab === 'logs' })}>
                    <div className="hint">
                      BUILD STATUS
                    </div>
                    <div className="build-detail-status">
                      { detail.basic.status || 'Compiling...' }
                    </div>

                    <div className="build-detail-info">
                      Submitted at <strong>{ formatDate(new Date(detail.basic.created)) }</strong>{ !!detail.basic.finished && (
                        <>, finished in <strong>{formatDuration(new Date(detail.basic.finished) - new Date(detail.basic.created))}</strong></>
                      )}
                    </div>

                    { detail.bit !== null && (
                      <>
                        <button className="labeled-btn" onClick={downloadBit}>
                          <Icon>file_download</Icon> <span>BITSTREAM ({formatSize(detail.bit.length)})</span>
                        </button>

                        <button
                          className="labeled-btn"
                          disabled={!idleBoard}
                          onClick={() => dispatch(programBitstream(detail.basic.id))}
                        >
                          <Icon>cloud_download</Icon> <span>{ hasBoard ? (
                            idleBoard ? 'PROGRAM FPGA' : 'PROGRAMMING...'
                          ) : 'FPGA DISCONNECTED' }</span>
                        </button>
                      </>
                    ) }

                    <div className="build-detail-sep" />

                    { detail.constraints ? (
                      <>
                        <div className="hint">
                          CONSTRAINTS
                        </div>

                        <Highlighter
                          className="build-detail-console"
                          source={detail.constraints}
                          type="constraints"
                        />

                        <div className="build-detail-sep" />
                      </>
                    ) : null }

                    { detail.logs ? (
                      <>
                        { detail.logs.stderr !== '' && (
                          <>
                            <div className="hint">
                              STDERR
                            </div>

                            <Highlighter
                              className="build-detail-console"
                              source={detail.logs.stderr}
                              type="log"
                            />

                            <div className="build-detail-sep" />
                          </>
                        ) }

                        <div className="hint">
                          STDOUT
                        </div>

                        <Highlighter
                          className="build-detail-console"
                          source={detail.logs.stdout}
                          type="log"
                        />
                      </>
                    ) : (
                      <div className="build-detail-placeholder">
                        <div className="loading" />
                      </div>
                    ) }

                  </div>

                  <div className={cn("build-detail-pane", "centering", { 'pane-active': detailTab === 'code' })}>
                    { detail.code ? (
                      <Monaco
                        options={{
                          theme: 'vs-dark',
                          language: `${detail.lang || 'vhdl'}-ro`,
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
      </TransitionGroup>

      <TransitionGroup className="snackbar">
        { snackbar.reverse().map(({ id, spec }, idx) => (
          <CSSTransition
            key={id}
            timeout={500}
            classNames="fade"
          >
            <div className="snackbar-entry-wrapper">
              <div
                className="snackbar-entry"
                onClick={() => dispatch(popSnackbar(id))}
                data-iter={idx + 1}
                title={typeof spec.msg === 'string' ? spec.msg : undefined}
              >
                <div className="snackbar-msg">
                  { spec.msg }
                </div>

                { spec.action && (
                  <button className="snackbar-action" onClick={e => {
                    e.stopPropagation();
                    spec.action();
                  }}>
                    { spec.actionText || 'ACTION' }
                  </button>
                ) }
              </div>
            </div>
          </CSSTransition>
        )) }
      </TransitionGroup>

      <HelpLayer />
    </TimeoutContext.Provider>
  </div>;
})
