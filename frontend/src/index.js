import './index.scss';

import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';
import * as serviceWorker from './serviceWorker';

import initLang from './lang';

import store from './store';
import { showSnackbar } from './store/actions';

import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

/* Polyfills */
import { ResizeObserver, TextEncoder, TextDecoder } from './polyfills';

if(!window.ResizeObserver)
  window.ResizeObserver = ResizeObserver;

if(!window.TextEncoder)
  window.TextEncoder = TextEncoder;

if(!window.TextDecoder)
  window.TextDecoder = TextDecoder;

initLang(store);

const build = App => () => <Provider store={store}>
  <BrowserRouter basename={process.env.PUBLIC_URL}>
    <App />
  </BrowserRouter>
</Provider>;


const Render = build(App);

ReactDOM.render(<Render />, document.getElementById('root'));

console.log('Hey!');

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register({
  onUpdate(reg) {
    store.dispatch(showSnackbar(
      'Update available!',
      0,
      () => {
        const waiting = reg.waiting;
        waiting.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(() => window.location.reload(true), 50); // Wait for 50ms for the sw to activate
      },
      'REFRESH',
    ));
  }
});

// Hot reloading
if(module.hot) {
  module.hot.accept('./App', () => {
    const App = require('./App').default;
    const Render = build(App);
    ReactDOM.render(<Render />, document.getElementById('root'));
  });
}

/* eslint-disable no-undef */
console.log('Using version', __COMMIT_HASH__);

let x = document.getElementById("global-loading-indicator");
if (x && x.style) {
  x.style.display = "none";
}
