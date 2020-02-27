import React, { useState, useCallback, useEffect } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';

import { HARD_LOGOUT, BOARDS } from './config';

import { BOARD_STATUS, init, logout, programBitstream, loadMoreBuilds } from './store/actions';

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
                <Icon className="build-list-action">edit</Icon>
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
  </div>;
})
