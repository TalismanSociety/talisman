/* eslint-env es2021 */

/**
 * Credits : Rabby wallet
 * https://github.com/RabbyHub/Rabby/blob/342eb111f06b3c30d1e06ac9a60ee1c4c4eaae73/build/plugins/AssetReplacePlugin.js
 *
 * replace string with other assets content at "afterProcessAssets"
 *
 * Added a check to prevent replacing content of all files, which triggered multiple hot reloads
 */

class AssetReplacePlugin {
  constructor(options) {
    this.options = options
  }
  apply(compiler) {
    const {
      webpack: {
        sources: { RawSource },
      },
    } = compiler
    compiler.hooks.make.tapAsync("AssetReplacePlugin", (compilation, callback) => {
      compilation.hooks.afterProcessAssets.tap("AssetReplacePlugin", () => {
        const replaceArr = Object.entries(this.options)
          .map(([k, v]) => {
            let assetName
            for (const chunk of compilation.chunks.values()) {
              if (chunk.name === v) {
                assetName = chunk.files.values().next().value

                break
              }
            }
            return [k, assetName]
          })
          .filter(([, assetName]) => assetName)

        if (replaceArr.length === 0) return callback()
        const replaceFn = replaceArr
          .map(([k, assetName]) => {
            // github.com/webpack/webpack-sources/blob/master/lib/ConcatSource.js
            const content = compilation.assets[assetName]?.source()

            return (source) => {
              return source.split(new RegExp(`['"]?${k}['"]?`)).join(JSON.stringify(content))
            }
          })
          .reduce((m, n) => (content) => n(m(content)))

        for (const chunk of compilation.chunks.values()) {
          const fileName = chunk.files.values().next().value
          const fileContent = compilation.assets[fileName]?.source()

          if (
            // replace file content only if it contains any of the keys
            replaceArr.some(([pattern]) => fileContent.includes(pattern)) &&
            // except if it's the file to inject (prevent infinite loop)
            !replaceArr.includes(([, assetName]) => assetName === fileName)
          ) {
            compilation.updateAsset(fileName, (content) => {
              const result = replaceFn(content.source())
              return new RawSource(result)
            })
          }
        }
      })

      callback()
    })
  }
}

module.exports = AssetReplacePlugin
