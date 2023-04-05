const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const DotenvWepack = require("dotenv-webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: "production",
  entry:  {
    background: path.resolve(__dirname, "..", "src", "background.ts"),
    "paste-detector": path.resolve(__dirname, "..", "src", "paste-detector.ts"),
    "app": path.resolve(__dirname, "..", "src", "app.tsx"),
    "popup": path.resolve(__dirname, "..", "src", "popup.tsx")
  },
  output: {
    path: path.join(__dirname, "../dist")
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        resolve: {
          extensions: ['.ts', '.tsx', '.js', '.json'],
        },
        use: 'ts-loader'
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  devServer: {
    client: {
      overlay: {
        warnings: false
      }
    }
  },
  devtool: process.env.NODE_ENV === "production" ? undefined : 'source-map',
  plugins: [
    new DotenvWepack({
      path: "./.env",
      safe: true
    }),
    new CopyPlugin({
      patterns: [
        {
          from: ".",
          to: ".",
          context: "public"
        }
      ]
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "..", "public", "app.html"),
    }),
    new MiniCssExtractPlugin(),
  ]
}