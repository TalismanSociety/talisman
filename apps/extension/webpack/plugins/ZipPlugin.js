/* eslint-env es2021 */
/**
 * Using this custom plugin because `zip-webpack-plugin` hooks into processAssets,
 * but we need it to hook into afterProcessAssets to allow ReplaceAssetPlugin to do its job before files get zipped.
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
    // test if the dist folder exists
    // if not, a compilation error must have occurred before this step.
    // when that happens, we should exit here so that webpack can tell us what went wrong
    // if we try to continue, we'll replace the helpful compilation error with less helpful `failed to create zip archive` error
    if (!fs.existsSync(options.folder)) return callback()

    const output = fs.createWriteStream(path.join(options.folder, options.filename))
    var archive = archiver("zip")

    output.on("error", function (err) {
      console.error("Failed to create zip file (output)", err)
      callback(err)
    })
    output.on("close", function () {
      console.log(`${options.filename} generated: ${archive.pointer()} total bytes`)
      callback()
    })

    archive.on("error", function (err) {
      console.error("Failed to create zip file (archive)", err)
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
