/* eslint-env es2021 */

const fs = require("fs-extra")
const path = require("path")

class CopyAfterBuildPlugin {
  constructor(options) {
    this.options = options || {}
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync("CopyAfterBuildPlugin", (compilation, callback) => {
      const outputPath = compiler.options.output.path
      const destinations = this.options.destinations || []

      Promise.all(
        destinations.map((dest) => {
          const destPath = path.resolve(dest)
          return fs.copy(outputPath, destPath)
        })
      )
        .then(() => callback())
        .catch((err) => {
          console.error("Error copying files:", err)
          callback(err)
        })
    })
  }
}

module.exports = CopyAfterBuildPlugin
