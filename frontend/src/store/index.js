import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';

import * as reducers from './reducers';

export default createStore(
  combineReducers(reducers),
  applyMiddleware(thunk, logger),
);
