var assert = require("assert")
/* eslint-env es2021 */

const HtmlWebpackPlugin = require("html-webpack-plugin")

function HtmlWebpackSingleEntryPointPlugin(options) {
  assert.equal(options, undefined, "The HtmlWebpackExcludeAssetsPlugin does not accept any options")
  this.PluginName = "HtmlWebpackExcludeAssetsPlugin"
}

HtmlWebpackSingleEntryPointPlugin.prototype.apply = function (compiler) {
  compiler.hooks.compilation.tap(this.PluginName, this.applyCompilation.bind(this))
}

HtmlWebpackSingleEntryPointPlugin.prototype.applyCompilation = function applyCompilation(
  compilation
) {
  // var self = this;

  HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration.tapAsync(
    this.PluginName,
    registerCb
  )

  function registerCb(htmlPluginData, callback) {
    console.log({ htmlPluginData })
    console.log(htmlPluginData.plugin.options.chunks[0], htmlPluginData.outputName)
    if (htmlPluginData.outputName !== `${htmlPluginData.plugin.options.chunks[0]}.html`)
      return callback(null, { ...htmlPluginData, outputName: undefined })
    if (callback) {
      callback(null, htmlPluginData)
    } else {
      return Promise.resolve(htmlPluginData)
    }
  }
}

module.exports = HtmlWebpackSingleEntryPointPlugin
