const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const DotenvWepack = require("dotenv-webpack");

module.exports = {
  mode: "production",
  entry:  {
    background: path.resolve(__dirname, "..", "src", "background.ts"),
    "paste-detector": path.resolve(__dirname, "..", "src", "paste-detector.ts")
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
        loader: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
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
    })
  ]
}