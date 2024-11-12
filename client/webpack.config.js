const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup/popup.ts',
    content: './src/content/content.ts',
    'monaco-proxy': './src/monaco-proxy/monaco-proxy.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src/'),
      '@shared': path.resolve(__dirname, '../shared/')
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/popup/popup.html", to: "popup.html" },
        { from: "manifest.json", to: "manifest.json" },
      ],
    }),
  ],
};