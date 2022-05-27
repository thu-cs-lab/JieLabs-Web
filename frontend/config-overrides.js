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
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

const path = require('path');
const webpack = require('webpack');

let commitInfo = process.env.CI_COMMIT_SHA;
if(!commitInfo)
  commitInfo = require('child_process')
    .execSync('git describe --all --dirty --long')
    .toString();

const allOverrides = [
  addWebpackPlugin(new MonacoPlugin({
    languages: [],
  })),
  addWebpackPlugin(new webpack.DefinePlugin({
    __COMMIT_HASH__: JSON.stringify(commitInfo),
  })),
  addWebpackPlugin(new AnalyzerPlugin({ analyzerMode: (!!process.env.ANALYZE) ? 'static' : 'none', openAnalyzer: false })),
  addWebpackPlugin(new WasmPackPlugin({
    crateDirectory: path.resolve(__dirname, './src/lib'),
    outDir: path.resolve(__dirname, './src/lib/pkg'),
  })),
  addWebpackModuleRule({ test: /\.wasm$/, type: 'webassembly/async' }),
  addWebpackModuleRule({ test: /\.vhdl/, use: 'raw-loader' }),
  addWebpackModuleRule({ test: /\.v/, use: 'raw-loader' }),
  // useEslintRc(),
];

const prodOverrides = [
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
  setWebpackOptimizationSplitChunks({
    chunks: 'all',
    name: false,

    cacheGroups: {
      monaco: {
        test: /[\\/]node_modules[\\/]monaco-editor/,
        reuseExistingChunk: false,
      },
    },
  })
];

const devOverrides = [];

function createOverrider(env) {
  if(env === 'development') return override(...allOverrides, ...devOverrides);
  else return override(...allOverrides, ...prodOverrides);
}

module.exports = function(config, env) {
  const overrider = createOverrider(env);
  const overriden = overrider(config, env);
  overriden.experiments = {
    ...overriden.experiments,
    asyncWebAssembly: true,
  };
  overriden.infrastructureLogging = {
    debug: true,
    level: 'verbose',
  };
  console.log(overriden);
  return overriden;
}

