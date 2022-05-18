/* eslint-env es2021 */
const path = require("path")
const { merge } = require("webpack-merge")
const common = require("./webpack.common.js")
const CopyPlugin = require("copy-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const SentryWebpackPlugin = require("@sentry/webpack-plugin")
const ZipPlugin = require("zip-webpack-plugin")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin

const distDir = path.join(__dirname, "..", "dist")

const getFileName = () => {
  console.log("COMMIT_SHA=%s", process.env.COMMIT_SHA)
  console.log("BUILD=%s", process.env.BUILD)
  switch (process.env.BUILD) {
    case "ci":
      return `talisman_extension_ci_${process.env.COMMIT_SHA ?? Date.now()}.zip`
    case "canary":
      return `talisman_extension_v${process.env.npm_package_version}_canary.zip`
    case "production":
    default:
      return `talisman_extension_v${process.env.npm_package_version}.zip`
  }
}

// Ensure plugins in this array will not change source in any way that will affect source maps
let plugins = [
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

          // Set the canary title and icon if we're doing a canary build
          if (process.env.BUILD === "canary") {
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
    filename: getFileName(),
    exclude: new RegExp(/\.js\.map$/, "m"),
  }),
  new BundleAnalyzerPlugin({
    // analyzerMode defaults to server, spawning a http server which can hang the process
    // static will instead output a static html file to the dist folder, and not hang the terminal
    analyzerMode: process.env.BUILD === "ci" ? "disabled" : "static",
  }),
]

if (["production", "canary"].includes(process.env.BUILD)) {
  // only the person or bot that builds for store release should have an auth token
  if (!process.env.SENTRY_AUTH_TOKEN)
    console.warn("Missing SENTRY_AUTH_TOKEN env variable, release won't be uploaded to Sentry")
  else
    plugins = [
      new SentryWebpackPlugin({
        // see https://docs.sentry.io/product/cli/configuration/ for details
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: "talisman",
        project: "talisman-extension",
        release: process.env.npm_package_version,
        dist: process.env.npm_package_version,
        include: distDir,
      }),
      ...plugins,
    ]
}

const fullConfig = merge(common, {
  devtool: "source-map",
  mode: "production",
  plugins,
  optimization: {
    minimize: true,
    // ensure we're using the correct version of terser-webpack-plugin
    // can be removed when we switch to webpack 5
    minimizer: [new TerserPlugin({ terserOptions: { compress: true } })],
  },
})

module.exports = fullConfig
