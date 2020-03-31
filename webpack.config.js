const HtmlWebPackPlugin = require('html-webpack-plugin'),
  MiniCssExtractPlugin = require('mini-css-extract-plugin'),
  path = require('path')

module.exports = {
  entry: path.resolve(__dirname, 'src/renderer/index.js'),
  target: 'electron-renderer',
  output: {
    path: path.resolve(__dirname, 'app'),
    filename: 'app.js'
  },
  devtool: 'eval-cheap-source-map',
  module: {
    rules: [{
        test: /\.js$/,
        use: ['import-glob'],
        enforce: 'pre'
      }, {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      }, {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.html$/,
        use: {
          loader: 'html-loader'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: {
          loader: 'file-loader',
        }
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'app.css'
    }),
    new HtmlWebPackPlugin({
      template: './static/index.html',
      filename: './index.html'
    })
  ],
  devServer: {
    open: false,
    hot: true,
    port: 9000
  }
};