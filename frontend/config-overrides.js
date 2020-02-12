const {
  override,
  addWebpackPlugin,
} = require('customize-cra');

const MonacoPlugin = require('monaco-editor-webpack-plugin');

module.exports = override(
  addWebpackPlugin(new MonacoPlugin()),
);
