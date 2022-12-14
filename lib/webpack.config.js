//@ts-check

'use strict';

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const libConfig = {
  target: 'node',
  entry: './src/index.ts',
	mode: 'none',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts'],
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: {
        name: 'debug_tracker_vscode',
        type: 'umd'
    }
  }
}
module.exports = [ libConfig ];
