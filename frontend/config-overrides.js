const {
  override,
  addWebpackPlugin,
  addWebpackModuleRule,
  adjustWorkbox,
  useEslintRc,
  setWebpackOptimizationSplitChunks,
} = require('customize-cra');

const MonacoPlugin = require('monaco-editor-webpack-plugin');
const AnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { GenerateSW } = require('workbox-webpack-plugin');

const path = require('path');
const webpack = require('webpack');

let commitInfo = process.env.CI_COMMIT_SHA;
if(!commitInfo)
  commitInfo = require('child_process')
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
  addWebpackPlugin(
    new GenerateSW({
      navigateFallback: `${process.env.PUBLIC_URL || ''}/index.html`,
      navigateFallbackDenylist: [
        /\/api\/.*/, // TODO: properly does this based on BACKEND in config
        new RegExp('/[^/?]+\\.[^/]+$'),
      ],
      maximumFileSizeToCacheInBytes: 8388608,
    })
  ),
  addWebpackModuleRule({ test: /\.wasm$/, type: 'webassembly/experimental' }),
  addWebpackModuleRule({ test: /\.vhdl/, use: 'raw-loader' }),
  addWebpackModuleRule({ test: /\.v/, use: 'raw-loader' }),
  setWebpackOptimizationSplitChunks({
    chunks: 'all',
    name: false,

    cacheGroups: {
      monaco: {
        test: /[\\/]node_modules[\\/]monaco-editor/,
        reuseExistingChunk: false,
      },
    },
  }),
);
