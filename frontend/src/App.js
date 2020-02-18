import React, { useState, useCallback, useEffect } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';

import { HARD_LOGOUT, BOARDS } from './config';

import { init, logout } from './store/actions';

import Login from './routes/Login';
import Workspace from './routes/Workspace';
import Admin from './routes/Admin';
import Icon from './comps/Icon';

import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';

export default React.memo(() => {
  const dispatch = useDispatch();
  const history = useHistory();

  const [loading, setLoading] = useState(true);

  const boardTmpl = useSelector(state => state.signals.board);
  const boardTmplName = BOARDS[boardTmpl].name;

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

  const darkTheme = createMuiTheme({
    palette: {
      type: 'dark',
    },
  });

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
        <div className="logout" onClick={doLogout}>
          <Icon>logout</Icon>
        </div>
      </div>
    </header>
    <Switch>
      <Route path="/login" exact>
        <Login />
      </Route>
      <ThemeProvider theme={darkTheme}>
        <Route path="/admin" exact>
          <Admin />
        </Route>
      </ThemeProvider>
      <Route path="/" exact>
        <Workspace />
      </Route>
    </Switch>
  </div>;
})
