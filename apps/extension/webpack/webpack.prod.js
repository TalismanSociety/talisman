/* eslint-env es2021 */

const { merge } = require("webpack-merge")
const CopyPlugin = require("copy-webpack-plugin")
const ZipPlugin = require("./ZipPlugin")
const TerserPlugin = require("terser-webpack-plugin")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin

const common = require("./webpack.common.js")
const { distDir, getArchiveFileName, getSentryPlugin, getManifestVersionName } = require("./utils")
const { SourceMapDevToolPlugin } = require("webpack")

const config = (env) => {
  if (env.build === "production") {
    if (!process.env.POSTHOG_AUTH_TOKEN) {
      console.warn("Missing POSTHOG_AUTH_TOKEN env variable")
      throw new Error("Missing POSTHOG_AUTH_TOKEN env variable")
    }
  }

  return merge(common(env), {
    devtool: false,
    mode: "production",
    plugins: [
      new SourceMapDevToolPlugin({
        filename: "[file].map[query]",
        exclude: ["content_script.js", "page.js"],
      }),
      // Ensure plugins in this array will not change source in any way that will affect source maps
      getSentryPlugin(env),
      new CopyPlugin({
        patterns: [
          {
            from: "manifest.json",
            to: distDir,
            context: "public",
            // overwrite non-transformed manifest.json
            force: true,
            // copied last to overwrite the `dist/manifest.json` copied by the `from "."` pattern
            priority: 10,
            transform(content) {
              // Parse the manifest
              const manifest = JSON.parse(content.toString())

              // Update the version in the manifest file to match the version in package.json
              manifest.version = process.env.npm_package_version

              // add a version name key to distinguish in list of installed extensions
              manifest.version_name = getManifestVersionName(env)

              // Set the canary title and icon if we're doing a canary build
              if (env.build === "canary") {
                manifest.name = `${manifest.name} - Canary`
                manifest.browser_action.default_title = `${manifest.browser_action.default_title} - Canary`

                for (const key in manifest.icons) {
                  const filename = manifest.icons[key]
                  const name = filename.split(".").slice(0, -1).join()
                  const extension = filename.split(".").slice(-1).join()

                  manifest.icons[key] = `${name}-canary.${extension}`
                }
              }

              // Return the modified manifest
              return JSON.stringify(manifest, null, 2)
            },
          },
          { from: ".", to: distDir, context: "public" },
        ],
      }),
      // Do not include source maps in the zip file
      new ZipPlugin({
        folder: distDir,
        filename: getArchiveFileName(env),
        exclude: "*.js.map",
      }),
      new BundleAnalyzerPlugin({
        // analyzerMode defaults to server, spawning a http server which can hang the process
        // static will instead output a static html file to the dist folder, and not hang the terminal
        analyzerMode: env.build === "ci" ? "disabled" : "static",
      }),
    ].filter(Boolean),
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin({ terserOptions: { compress: true } })],
    },
  })
}

module.exports = config
