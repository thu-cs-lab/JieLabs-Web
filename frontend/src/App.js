import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';

import Login from './routes/Login';

export default React.memo(() => {
  const logined = useSelector(store => store.user !== null);

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
    </header>
    <Login />
  </div>;
})
