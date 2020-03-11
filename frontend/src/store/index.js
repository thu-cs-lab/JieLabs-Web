import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';

import * as reducers from './reducers';

import { Map } from 'immutable';
import { DEFAULT_BOARD } from '../config';

let lastCode = window.localStorage.getItem('code') || '';
let lastBoard = window.localStorage.getItem('board') || DEFAULT_BOARD;
let lastTop = window.localStorage.getItem('top') || null;
let lastSignals = Map(JSON.parse(window.localStorage.getItem('signals')) || {});
let lastLang = window.localStorage.getItem('lang') || 'vhdl';

let middleware = [thunk];
if (process.env.NODE_ENV !== 'production') {
  middleware = [...middleware, logger]
}

const store = createStore(
  combineReducers(reducers),
  {
    code: lastCode,
    constraints: {
      board: lastBoard,
      top: lastTop,
      signals: lastSignals,
    },
    lang: lastLang,
  },
  applyMiddleware(...middleware),
);

store.subscribe(() => {
  const { code, constraints: { board, top, signals }, lang } = store.getState();

  if(code !== lastCode) {
    lastCode = code;
    window.localStorage.setItem('code', code);
  }

  if(board !== lastBoard) {
    lastBoard = board;
    window.localStorage.setItem('board', board);
  }

  if(top !== lastTop) {
    lastTop = top;
    window.localStorage.setItem('top', top);
  }

  if(signals !== lastSignals) {
    lastSignals = signals;
    window.localStorage.setItem('signals', JSON.stringify(signals.toJS()));
  }

  if(lang !== lastLang) {
    lastLang = lang;
    window.localStorage.setItem('lang', lang);
  }
});

export default store;
