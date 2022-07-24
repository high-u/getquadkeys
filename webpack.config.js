const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/js/quadkey.js",
  output: {
    filename: "./js/quadkey.js",
    // path: path.join(__dirname, "dist/")
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "public", to: "." },
        { from: "src/index.html", to: "." }
      ],
    }),
  ]
};
