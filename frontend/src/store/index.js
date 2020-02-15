import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';

import * as reducers from './reducers';

let lastCode = window.localStorage.getItem('code') || '';

const store = createStore(
  combineReducers(reducers),
  { code: lastCode },
  applyMiddleware(thunk, logger),
);

store.subscribe(() => {
  const { code } = store.getState();

  if(code !== lastCode) {
    lastCode = code;
    window.localStorage.setItem('code', code);
  }
});

export default store;
