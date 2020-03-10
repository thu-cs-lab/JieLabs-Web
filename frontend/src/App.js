import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';
import pako from 'pako';
import { saveAs } from 'file-saver';

import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { HARD_LOGOUT, BOARDS, TAR_FILENAMES, TIMEOUT, TIMEOUT_BUFFER } from './config';
import {
  BOARD_STATUS,
  init,
  logout,
  programBitstream,
  loadMoreBuilds,
  showSnackbar,
  popSnackbar,
  disconnectBoard,
  updateLang,
  importWorkspace,
} from './store/actions';
import { untar, readFileStr, formatSize, formatDuration, formatDate, post } from './util';

import Icon from './comps/Icon';
import Tooltip from './comps/Tooltip';
import Highlighter from './comps/Highlighter';
import Input from './comps/Input';
import Dialog from './comps/Dialog';
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

  const Nullify = useCallback(() => null, []);

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

  const [settings, setSettings] = useState(false);
  const [newPass, setNewPass] = useState('');
  const user = useSelector(state => state.user);
  const showSettings = useCallback(() => {
    setSettings(true);
    setNewPass('');
  }, []);
  const dismissSettings = useCallback(() => setSettings(false), []);
  const submitPass = useCallback(async () => {
    await post(`/api/user/manage/${user.user_name}`, {
      password: newPass,
    });
    dispatch(showSnackbar('Password updated!', 5000));
  }, [newPass, user?.user_name]);

  const lang = useSelector(store => store.lang);
  const setLanguage = useCallback(lang => dispatch(updateLang(lang)));

  const [about, setAbout] = useState(false);
  const showAbout = useCallback(() => {
    setSettings(false);
    setAbout(true);
  }, []);
  const dismissAbout = useCallback(() => setAbout(false), []);

  const sandboxHandlerRef = useRef(null);

  const [importing, setImporting] = useState(false);
  const dragCnt = useRef(0);
  const containerRef = useRef(null);
  const handleDragEnter = useCallback(e => {
    ++dragCnt.current;
    const isFiles = e.dataTransfer.types.includes('Files');
    if(!isFiles) return;

    e.dataTransfer.dropEffect = 'copy';
    e.preventDefault();
    setImporting(true);
  }, []);

  const handleDragOver = useCallback(e => {
    if(!importing) return;
    e.dataTransfer.dropEffect = 'copy';
    e.stopPropagation();
    e.preventDefault();
  }, [importing]);

  const handleDragLeave = useCallback(e => {
    --dragCnt.current;
    if(dragCnt.current === 0)
      setImporting(false);
  }, []);

  const handleDrop = useCallback(async e => {
    e.preventDefault();
    if(!importing) return;
    setImporting(false);
    dragCnt.current = 0;

    const file = e.dataTransfer.files[0];
    const type = file?.type;
    if(type.indexOf('application/json') !== 0) {
      dispatch(showSnackbar(`Invalid file format: ${type}`));
      return;
    }

    try {
      const text = await file.text();
      console.log(text);
      const parsed = JSON.parse(text);

      const { redux, sandbox } = parsed;
      // TODO: Check fields

      dispatch(importWorkspace(redux));
      sandboxHandlerRef.current.import(sandbox);
    } catch(e) {
      console.error(e);
      dispatch(showSnackbar('Unable to parse save file'));
    }
  }, [importing]);

  if(loading) 
    return <div className="container pending"></div>;

  return <div
    ref={containerRef}
    className="container"
    onDragEnter={handleDragEnter}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
  >
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
        <Route path="/" exact render={() => <Workspace showSettings={showSettings} sandboxHandlerRef={sandboxHandlerRef} />} />
      </Switch>

      <Dialog className="build-detail-dialog" open={detail} onClose={dismissDetail}
        render={() => (<>
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
        </>)}
      >
      </Dialog>

      <Dialog className="settings-dialog" open={settings} onClose={dismissSettings}>
        <div className="hint">
          LOGGED IN AS <strong>{ user?.user_name }</strong>
        </div>
        <div className="user-realname">
          { user?.real_name }
        </div>
        <div className="user-pass">
          <Input label="New Password" className="user-pass-input" onChange={setNewPass} value={newPass} type="password" />
          <button onClick={submitPass}>
            <Icon>arrow_forward</Icon>
          </button>
        </div>

        <div className="hint">LANGUAGE</div>
        <div className="languages">
          <div className={cn('language', { 'language-selected': lang === 'verilog' })} onClick={() => setLanguage('verilog')}>
            <div className="language-ind"><Icon>done</Icon></div>
            <div className="language-name">Verilog</div>
          </div>

          <div className={cn('language', { 'language-selected': lang === 'vhdl' })} onClick={() => setLanguage('vhdl')}>
            <div className="language-ind"><Icon>done</Icon></div>
            <div className="language-name">VHDL</div>
          </div>
        </div>

        <div className="hint">MISC</div>
        <button
          className="labeled-btn"
          onClick={showAbout}
        >
          <div className="labeled-btn-icon"><span role="img" aria-label="Strawberry">🍓</span></div><span>ABOUT</span>
        </button>
      </Dialog>

      <Dialog open={about} onClose={dismissAbout} className="about-dialog">
        <div className="brand"><strong>Jie</strong>Labs</div>
        <div className="ref">
          { __COMMIT_HASH__ /* eslint-disable-line */ }
        </div>

        <div className="hint">BY</div>
        陈嘉杰 <span className="sep">/</span> 高一川 <span className="sep">/</span> 刘晓义

        <div className="hint">USING</div>
        <a href="https://www.rust-lang.org/">Rust</a>
        <span className="sep">/</span>
        <a href="https://actix.rs/">actix-web</a>
        <span className="sep">/</span>
        <a href="https://diesel.rs/">diesel</a>
        <br />
        <a href="https://reactjs.org/">React</a>
        <span className="sep">/</span>
        <a href="https://sass-lang.com/">SASS</a>
        <span className="sep">/</span>
        <a href="https://microsoft.github.io/monaco-editor/">Monaco</a>
        <br />
        <a href="https://www.docker.com/">Docker</a>
        <span className="sep">/</span>
        <a href="https://kubernetes.io/">Kubernetes</a>
        <span className="sep">/</span>
        <a href="https://www.intel.cn/content/www/cn/zh/software/programmable/quartus-prime/overview.html">Quartus</a>

        <div className="hint">RELEASED UNDER</div>
        Jiegec Public License
      </Dialog>

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

      <HelpLayer onDone={showSettings} />

      <div className={cn("drop-layer", { 'drop-layer-shown': importing })}>
        <Icon>open_in_browser</Icon>
        Load workspace
      </div>
    </TimeoutContext.Provider>
  </div>;
})
