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

const store = createStore(
  combineReducers(reducers),
  {
    code: lastCode,
    constraints: {
      board: lastBoard,
      top: lastTop,
      signals: lastSignals,
    }
  },
  applyMiddleware(thunk, logger),
);

store.subscribe(() => {
  const { code, constraints: { board, top, signals } } = store.getState();

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
});

export default store;
