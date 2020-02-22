import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import cn from 'classnames';

import { login } from '../store/actions';

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

  const checkEnter = useCallback(ev => {
    if(ev.key === 'Enter') doLogin();
  }, [doLogin]);

  return <main className="centering">
    <div className="login-box">
      <Input label="Username" className="login-input" onChange={changeUser} />
      <div className="login-spanner"></div>
      <Input label="Password" type="password" className="login-input" onChange={changePass} onKeyDown={checkEnter} />

      <button className={cn("login-button", { errored })} disabled={ user === '' || pass === '' } onClick={doLogin}>
        <Icon className="login-icon">
          arrow_forward
        </Icon>
      </button>
    </div>
  </main>;
});
