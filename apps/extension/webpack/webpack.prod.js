/* eslint-env es2021 */
const webpack = require("webpack")
const path = require("path")
const { merge } = require("webpack-merge")
const common = require("./webpack.common.js")
const CopyPlugin = require("copy-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const SentryWebpackPlugin = require("@sentry/webpack-plugin")
const ZipPlugin = require("zip-webpack-plugin")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const getGitShortHash = require("./utils").getGitShortHash

const distDir = path.join(__dirname, "..", "dist")

const getFileName = (env) => {
  switch (env.build) {
    case "ci":
      return `talisman_extension_ci_${getGitShortHash() ?? Date.now()}.zip`
    case "canary":
      return `talisman_extension_v${
        process.env.npm_package_version
      }_${getGitShortHash()}_canary.zip`
    case "production":
      return `talisman_extension_v${process.env.npm_package_version}.zip`
    default:
      return `talisman_extension_${getGitShortHash()}.zip`
  }
}

const getSentryRelease = (env) => {
  switch (env.build) {
    case "canary":
      return getGitShortHash()
    case "production":
      return process.env.npm_package_version
    default:
      return ""
  }
}

// Ensure plugins in this array will not change source in any way that will affect source maps
let getPlugins = (env) => {
  let plugins = [
    new webpack.DefinePlugin({
      "process.env.SENTRY_RELEASE": JSON.stringify(getSentryRelease(env)),
    }),
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
      filename: getFileName(env),
      exclude: new RegExp(/\.js\.map$/, "m"),
    }),
    new BundleAnalyzerPlugin({
      // analyzerMode defaults to server, spawning a http server which can hang the process
      // static will instead output a static html file to the dist folder, and not hang the terminal
      analyzerMode: env.build === "ci" ? "disabled" : "static",
    }),
  ]

  if (["production", "canary"].includes(env.build)) {
    // only the person or bot that builds for store release should have an auth token
    if (!process.env.SENTRY_AUTH_TOKEN)
      console.warn("Missing SENTRY_AUTH_TOKEN env variable, release won't be uploaded to Sentry")
    else {
      plugins = [
        new webpack.DefinePlugin({
          "process.env.SENTRY_DSN": JSON.stringify(process.env.SENTRY_DSN),
        }),
        new SentryWebpackPlugin({
          // see https://docs.sentry.io/product/cli/configuration/ for details
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: "talisman",
          project: "talisman-extension",
          release: getSentryRelease(env),
          include: distDir,
        }),
        ...plugins,
      ]
    }
  }
  return plugins
}

const fullConfig = (env) =>
  merge(common(env), {
    devtool: "source-map",
    mode: "production",
    plugins: getPlugins(env),
    optimization: {
      minimize: true,
      // ensure we're using the correct version of terser-webpack-plugin
      // can be removed when we switch to webpack 5
      minimizer: [new TerserPlugin({ terserOptions: { compress: true } })],
    },
  })

module.exports = fullConfig
