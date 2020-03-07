const {
  override,
  addWebpackPlugin,
  addWebpackModuleRule,
  adjustWorkbox,
  useEslintRc,
} = require('customize-cra');

const MonacoPlugin = require('monaco-editor-webpack-plugin');
const AnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const path = require('path');
const webpack = require('webpack');

const commitInfo = require('child_process')
  .execSync('git describe --all --dirty --long')
  .toString();

module.exports = override(
  addWebpackPlugin(new MonacoPlugin({
    languages: [],
  })),
  addWebpackPlugin(new webpack.DefinePlugin({
    __COMMIT_HASH__: JSON.stringify(commitInfo),
  })),
  addWebpackPlugin(new AnalyzerPlugin({ analyzerMode: (!!process.env.ANALYZE) ? 'static' : 'none', openAnalyzer: false })),
  addWebpackModuleRule({ test: /\.wasm$/, type: 'webassembly/experimental' }),
  addWebpackModuleRule({ test: /\.vhdl/, use: 'raw-loader' }),
  adjustWorkbox(wb => Object.assign(wb, {
    importWorkboxFrom: 'local',
    navigateFallbackBlacklist: [
      /^\/api\/.*/,
      new RegExp('/[^/?]+\\.[^/]+$'),
    ],
  })),
  useEslintRc(
    path.resolve(__dirname, './.eslintrc.json'),
  ),
);
