const {
  override,
  addWebpackPlugin,
  addWebpackModuleRule,
} = require('customize-cra');

const MonacoPlugin = require('monaco-editor-webpack-plugin');
const AnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = override(
  addWebpackPlugin(new MonacoPlugin({
    languages: [],
  })),
  addWebpackPlugin(new AnalyzerPlugin({ analyzerMode: 'static' })),
  addWebpackModuleRule({ test: /\.wasm$/, type: 'webassembly/experimental' }),
);
