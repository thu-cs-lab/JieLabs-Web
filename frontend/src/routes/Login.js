import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import cn from 'classnames';

import { login, restore } from '../store/actions';
import { BACKEND } from '../config';

import Input from '../comps/Input';
import Icon from '../comps/Icon';

export default React.memo(() => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [errored, setErrored] = useState(false);

  const changeUser = useCallback(v => {
    setErrored(false);
    setUser(v);
  }, []);

  const changePass = useCallback(v => {
    setErrored(false);
    setPass(v);
  }, []);

  const history = useHistory();

  const dispatch = useDispatch();
  const doLogin = useCallback(async () => {
    const success = await dispatch(login(user, pass));
    if(success)
      history.push("/");
    else
      setErrored(true);
  }, [dispatch, user, pass, history]);

  const [portalOngoing, setPortalOngoing] = useState(false);
  const doPortalAuth = useCallback(() => {
    const loginWindow = window.open(BACKEND + '/api/portal/auth');
    setPortalOngoing(true);
    const cb = async (ev) => {
      if(ev.data !== 'done') return;
      loginWindow.close();
      window.removeEventListener('message', cb);
      const success = await dispatch(restore())
      setPortalOngoing(false);

      if(success)
        history.push("/");
      else
        setErrored(true);
    };
    window.addEventListener('message', cb);
  }, [dispatch, user, pass, history]);

  const checkEnter = useCallback(ev => {
    if(ev.key === 'Enter') doLogin();
  }, [doLogin]);

  return <main className="centering">
    <div>
      <button className="login-portal" onClick={doPortalAuth} disabled={portalOngoing}>
        <div>
          <small>Login with</small>
          <div className="login-portal-name">yxportal</div>
        </div>
      </button>
      <div className="login-sep"></div>
      <div className="login-cred">
        <Input id="username" label="Username" className="login-input" onChange={changeUser} />
        <div className="login-spanner"></div>
        <Input id="password" label="Password" type="password" className="login-input" onChange={changePass} onKeyDown={checkEnter} />

        <button id="login" className={cn("login-button", { errored })} disabled={ user === '' || pass === '' } onClick={doLogin}>
          <Icon className="login-icon">
            arrow_forward
          </Icon>
        </button>
      </div>
    </div>
  </main>;
});
