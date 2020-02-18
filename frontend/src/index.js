import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import App from './App';
import * as serviceWorker from './serviceWorker';

import initVhdl from './vhdl';

import store from './store';

import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';

initVhdl(store);

const darkTheme = createMuiTheme({
  palette: {
    type: 'dark',
  },
});

const Render = () => <Provider store={store}>
  <ThemeProvider theme={darkTheme}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>
</Provider>;

ReactDOM.render(<Render />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register();
