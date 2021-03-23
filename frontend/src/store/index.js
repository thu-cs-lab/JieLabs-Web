import { compose, createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';

import * as Sentry from '@sentry/react';

import * as reducers from './reducers';

import { Map, List } from 'immutable';
import { DEFAULT_BOARD, DEFAULT_FIELD } from '../config';

const init = () => {
  const code = window.localStorage.getItem('code') || '';
  const board = window.localStorage.getItem('board') || DEFAULT_BOARD;
  const top = window.localStorage.getItem('top') || null;
  const signals = Map(JSON.parse(window.localStorage.getItem('signals')) || {});
  const lang = window.localStorage.getItem('lang') || 'vhdl';
  const field = List(JSON.parse(window.localStorage.getItem('field')) || DEFAULT_FIELD);

  let middleware = [thunk];
  if (process.env.NODE_ENV !== 'production') {
    middleware = [...middleware, logger]
  }

  const sentryEnhancer = Sentry.createReduxEnhancer({});

  const store = createStore(
    combineReducers(reducers),
    {
      code,
      constraints: {
        board,
        top,
        signals,
      },
      lang,
      field,
    },
    compose(applyMiddleware(...middleware), sentryEnhancer),
  );

  function saver(name, first, mapper = data => data) {
    let last = first;
    return data => {
      if(data !== last) {
        last = data;

        const mapped = mapper(data);
        window.localStorage.setItem(name, mapped);
      }
    }
  }

  const saveCode = saver('code', code);
  const saveBoard = saver('board', board);
  const saveTop = saver('top', top);
  const saveSignals = saver('signals', signals, d => JSON.stringify(d.toJS()));
  const saveLang = saver('lang', lang);
  const saveField = saver('field', field, d => JSON.stringify(d.toJS()));

  store.subscribe(() => {
    const { code, constraints: { board, top, signals }, lang, field } = store.getState();

    saveCode(code);
    saveBoard(board);
    saveTop(top);
    saveSignals(signals);
    saveLang(lang);
    saveField(field);
  });

  return store;
};

export default init;
