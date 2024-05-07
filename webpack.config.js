const path = require('path');

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'packed.js',
    path: path.resolve(__dirname, 'public'),
  },
  optimization: {
    minimize: false
  },
};