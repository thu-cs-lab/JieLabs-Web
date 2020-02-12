import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import Input from '../comps/Input';
import Icon from '../comps/Icon';

export default React.memo(() => {
  return <main className="centering">
    <div className="login-box">
      <Input label="Username" className="login-input" />
      <div className="login-spanner"></div>
      <Input label="Password" type="password" className="login-input" />

      <button className="login-button">
        <Icon className="login-icon">
          arrow_forward
        </Icon>
      </button>
    </div>
  </main>;
});
