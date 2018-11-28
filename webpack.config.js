const path = require('path');

module.exports = {
  entry: {
    alza: './src/alza.js',
    mall: './src/mall.js',
    czc: './src/czc.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  }
};
