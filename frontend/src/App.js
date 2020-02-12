import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Route, Switch, useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';

import { HARD_LOGOUT } from './config';

import { restore, logout } from './store/actions';

import Login from './routes/Login';
import Icon from './comps/Icon';

export default React.memo(() => {
  const dispatch = useDispatch();
  const history = useHistory();

  const [loading, setLoading] = useState(false);

  useEffect(async () => {
    const restored = await dispatch(restore());
    if(!restored) history.push('/login');
    setLoading(false);
  }, []);

  const logined = useSelector(store => store.user !== null);
  const doLogout = useCallback(async () => {
    await dispatch(logout())

    if(HARD_LOGOUT) {
      window.location.href = '/login';
    } else {
      // FIXME: routing guard
      history.push('/login');
    }
  });

  return <div className="container">
    <header>
      <div className="brand"><strong>Jie</strong>Labs</div>

      <div className={cn("stub", { 'stub-disabled': !logined })}>
        <div className="stub-text">
          Login
        </div>
        <span className="stub-caret">
        </span>
      </div>

      <div class="spanner"></div>

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
    </Switch>
  </div>;
})
