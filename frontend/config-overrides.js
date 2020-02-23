const {
  override,
  addWebpackPlugin,
  addWebpackModuleRule,
  adjustWorkbox,
} = require('customize-cra');

const MonacoPlugin = require('monaco-editor-webpack-plugin');
const AnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

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
);
