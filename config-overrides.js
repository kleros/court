/* eslint-disable react-hooks/rules-of-hooks */
const webpack = require("webpack");
const { addWebpackPlugin, override, useBabelRc } = require("customize-cra");

module.exports = override(useBabelRc(), addWebpackPlugin(new webpack.ContextReplacementPlugin(/v8-sandbox/)));
