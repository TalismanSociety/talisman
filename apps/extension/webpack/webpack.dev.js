/* eslint-env es6 */
const { merge } = require("webpack-merge")
const common = require("./webpack.common.js")
const path = require("path")
const distDir = path.join(__dirname, "..", "dist")
const CopyPlugin = require("copy-webpack-plugin")
const ExtensionReloader = require("@alectalisman/webpack-ext-reloader")
const CircularDependencyPlugin = require("circular-dependency-plugin")

module.exports = merge(common, {
  devtool: "eval-cheap-module-source-map",
  mode: "development",
  plugins: [
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

            // Return the modified manifest
            return JSON.stringify(manifest, null, 2)
          },
        },
        { from: ".", to: distDir, context: "public" },
      ],
    }),
    new ExtensionReloader({
      // avoid reloading every browser tab
      // extension pages (dashboard.html, popup.html) are always reloaded
      reloadPage: false,
      entries: {
        // The entries used for the content/background scripts
        contentScript: "content_script", // Use the entry names, not the file name or the path
        background: "background", // *REQUIRED
        extensionPage: ["popup", "onboarding", "dashboard"],
      },
    }),
    new CircularDependencyPlugin({
      // exclude detection of files based on a RegExp
      exclude: /node_modules/,
      // add errors to webpack instead of warnings
      failOnError: false,
      // allow import cycles that include an asyncronous import,
      // e.g. via import(/* webpackMode: "weak" */ './file.js')
      allowAsyncCycles: false,
      // set the current working directory for displaying module paths
      cwd: process.cwd(),
    }),
  ],
})
