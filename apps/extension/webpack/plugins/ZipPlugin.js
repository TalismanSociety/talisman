/* eslint-env es2021 */
/**
 * Using this custom plugin because `zip-webpack-plugin` hooks into processAssets,
 * but we need it to hook into afterProcessAssets to allow ReplaceAssetPlugin to do it's job before files get zipped.
 */
const path = require("path")
const fs = require("fs")
const archiver = require("archiver")

function ZipPlugin(options) {
  this.options = options || {}
}

ZipPlugin.prototype.apply = function (compiler) {
  const options = this.options

  if (options.pathPrefix && path.isAbsolute(options.pathPrefix)) {
    throw new Error('"pathPrefix" must be a relative path')
  }

  compiler.hooks.done.tapAsync(ZipPlugin.name, (_, callback) => {
    const output = fs.createWriteStream(path.join(options.folder, options.filename))
    var archive = archiver("zip")

    output.on("close", function () {
      console.log(`${options.filename} generated : ${archive.pointer()} total bytes`)
      callback()
    })

    archive.on("error", function (err) {
      console.error("Failed to create zip file", err)
      callback(err)
    })

    archive.pipe(output)
    const ignore = [options.filename]
    if (options.exclude) {
      ignore.push(options.exclude)
    }

    archive.glob("**/*", {
      cwd: options.folder,
      ignore,
    })

    archive.finalize()
  })
}

module.exports = ZipPlugin
