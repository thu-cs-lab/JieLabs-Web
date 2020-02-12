import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { login } from '../store/actions';

import Input from '../comps/Input';
import Icon from '../comps/Icon';

export default React.memo(() => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  const dispatch = useDispatch();
  const doLogin = useCallback(() => {
    dispatch(login(user, pass));
  }, [user, pass, dispatch]);

  return <main className="centering">
    <div className="login-box">
      <Input label="Username" className="login-input" onChange={setUser} />
      <div className="login-spanner"></div>
      <Input label="Password" type="password" className="login-input" onChange={setPass} />

      <button className="login-button" disabled={ user === '' || pass === '' } onClick={doLogin}>
        <Icon className="login-icon">
          arrow_forward
        </Icon>
      </button>
    </div>
  </main>;
});
