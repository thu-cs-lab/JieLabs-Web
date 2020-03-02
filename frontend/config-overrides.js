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

module.exports = override(
  addWebpackPlugin(new MonacoPlugin({
    languages: [],
  })),
  addWebpackPlugin(new AnalyzerPlugin({ analyzerMode: (!!process.env.ANALYZE) ? 'static' : 'none', openAnalyzer: false })),
  addWebpackModuleRule({ test: /\.wasm$/, type: 'webassembly/experimental' }),
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
