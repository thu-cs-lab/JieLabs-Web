import './index.scss';

import React from 'react';
import ReactDOM from 'react-dom';

import * as Sentry from '@sentry/browser';
import { SENTRY } from './config';

import App from './App';
import * as serviceWorker from './serviceWorker';

import buildStore from './store';
import { showSnackbar } from './store/actions';

import ErrorBoundary from './ErrorBoundary';

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

/* Sentry */
if(SENTRY !== null)
  Sentry.init({ dsn: SENTRY });

let storeSet = null;
const storePromise = new Promise(resolve => {
  storeSet = resolve;
});

const Root = React.memo(({ Comp }) => {
  const store = React.useMemo(() => buildStore(), []);

  React.useEffect(() => {
    import('./lang').then(mod => mod.default(store));
    storeSet(store);
  }, [store]);

  return (
    <Provider store={store}>
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <Comp />
      </BrowserRouter>
    </Provider>
  );
});

const build = App => () => <ErrorBoundary>
  <Root Comp={App} />
</ErrorBoundary>


const Render = build(App);

ReactDOM.render(<Render />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register({
  async onUpdate(reg) {
    const store = await storePromise;
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
