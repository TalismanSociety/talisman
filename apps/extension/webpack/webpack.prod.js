/* eslint-env es2021 */

const { merge } = require("webpack-merge")
const path = require("path")
const CopyPlugin = require("copy-webpack-plugin")
const ZipPlugin = require("./plugins/ZipPlugin")
const TerserPlugin = require("terser-webpack-plugin")
const CircularDependencyPlugin = require("circular-dependency-plugin")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin

const common = require("./webpack.common.js")
const {
  browser,
  distDir,
  updateManifestDetails,
  getArchiveFileName,
  manifestDir,
  getSentryPlugin,
  dropConsole,
} = require("./utils")
const { SourceMapDevToolPlugin } = require("webpack")
const SimpleLocalizeDownloadPlugin = require("./plugins/SimpleLocalizeDownloadPlugin")

const faviconsSrcPath = path.join(__dirname, "..", "public", "favicon*.*")

/** @type { import('webpack').Configuration } */
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
            from: "common.json",
            to: path.join(distDir, "manifest.json"),
            context: manifestDir,
            transform: async (content) => {
              const manifest = await updateManifestDetails(env, JSON.parse(content.toString()))
              return JSON.stringify(manifest, null, 2)
            },
          },
          {
            from: env.build === "canary" ? "favicon*-canary*" : "favicon*-prod*",
            to: ({ absoluteFilename }) =>
              path.join(
                distDir,
                path.basename(absoluteFilename).replace(/-(?:prod|canary|dev)/, ""),
              ),
            context: "public",
          },
          {
            from: ".",
            to: distDir,
            context: "public",
            // do not copy the manifest or the favicons, they're handled separately
            globOptions: {
              ignore: [manifestDir, faviconsSrcPath].concat(
                // service worker should be excluded for firefox
                browser === "firefox" ? ["service_worker.js"] : [],
              ),
            },
          },
        ],
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
      new SimpleLocalizeDownloadPlugin(),
      // Do not include source maps in the zip file
      new ZipPlugin({
        folder: distDir,
        filename: getArchiveFileName(env),
      }),
      new BundleAnalyzerPlugin({
        // analyzerMode defaults to server, spawning a http server which can hang the process
        // static will instead output a static html file to the dist folder, and not hang the terminal
        analyzerMode: env.build === "ci" ? "disabled" : "static",
      }),
    ].filter(Boolean),
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              defaults: true,
              // Drop any calls to console.error/warn/log/debug from production/canary builds, and when running tests
              drop_console: dropConsole(env) ? ["error", "warn", "log", "debug"] : false,
            },
          },
        }),
      ],
      splitChunks: {
        chunks: (chunk) =>
          !["background", "vendor-background", "content_script", "page"].includes(chunk.name),
        minSize: 0,
        maxSize: 4 * 1024 * 1024,
        maxInitialRequests: Infinity,
        cacheGroups: {
          "vendor-react": {
            test: /[\\/]node_modules[\\/](react|react-dom|lottie-react|lottie-web)[\\/]/,
            name: "vendor-react",
            priority: -1,
            reuseExistingChunk: true,
          },
          "vendor-substrate": {
            test: /[\\/]node_modules[\\/](@substrate)[\\/]/,
            name: "vendor-substrate",
            priority: -1,
            reuseExistingChunk: true,
          },
          "vendor": {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            priority: -2,
            reuseExistingChunk: true,
          },
          "defaultVendors": false,
          "default": false,
        },
      },
    },
  })
}

module.exports = config
