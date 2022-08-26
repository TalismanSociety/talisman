/* eslint-env es2021 */

const path = require("path")

const config = {
  entry: path.resolve(__dirname, "/src/index.ts"),
  output: {
    filename: "index.js",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  optimization: {
    minimize: false,
  },
}

module.exports = config
