import React from 'react';

import { BrowserRouter, Route } from 'react-router-dom';

import Login from './routes/Login';

export default React.memo(() => {
  return <div className="container">
    <header>
      <div className="brand"><strong>Jie</strong>Labs</div>

      <div className="stub">
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
