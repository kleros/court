/* eslint-disable react-hooks/rules-of-hooks */
const webpack = require("webpack");
const { addWebpackPlugin, override, useBabelRc } = require("customize-cra");

module.exports = override(
  useBabelRc(),
  addWebpackPlugin(
    // This is required because webpack doesn't play nice with v8-sandbox,
    // which is a dependency of @kleros/archon for non-browser environments.
    // It shouldn't be included in the bundle, but webpack apparently is doing that.
    new webpack.ContextReplacementPlugin(/v8-sandbox/)
  )
);
