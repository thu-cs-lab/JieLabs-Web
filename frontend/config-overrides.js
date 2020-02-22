const {
  override,
  addWebpackPlugin,
  addWebpackModuleRule,
} = require('customize-cra');

const MonacoPlugin = require('monaco-editor-webpack-plugin');

module.exports = override(
  addWebpackPlugin(new MonacoPlugin({
    languages: [],
  })),
  addWebpackModuleRule({ test: /\.wasm$/, type: 'webassembly/experimental' }),
);
