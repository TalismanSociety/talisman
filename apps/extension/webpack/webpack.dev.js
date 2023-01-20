/* eslint-env es2021 */

const { merge } = require("webpack-merge")
const common = require("./webpack.common.js")
const path = require("path")
const distDir = path.join(__dirname, "..", "dist")
const CopyPlugin = require("copy-webpack-plugin")
// const ExtensionReloader = require("@alectalisman/webpack-ext-reloader")
const CircularDependencyPlugin = require("circular-dependency-plugin")
const { EvalSourceMapDevToolPlugin } = require("webpack")
const SimpleLocalizeDownloadPlugin = require("./SimpleLocalizeDownloadPlugin")
const { getManifestVersionName } = require("./utils.js")

const manifestPath = path.join(__dirname, "..", "public", "manifest.json")
const faviconsSrcPath = path.join(__dirname, "..", "public", "favicon*.*")

const config = (env) =>
  merge(common(env), {
    devtool: false,
    mode: "development",
    watchOptions: {
      ignored: ["**/node_modules", "**/dist", "apps/extension/public/locales"],
    },
    plugins: [
      new EvalSourceMapDevToolPlugin({
        // Here we are using a negative look-behind to exclude the `eval()` devtool from content_script.ts and page.ts.
        //
        // If either of these scripts have `eval` in them, the wallet will be unable to inject on dapps with a good
        // content security policy, like https://app.uniswap.org/swap for example.
        test: /(?<!(content_script|page))\.(ts|js|mts|mjs|css)/,
      }),
      new SimpleLocalizeDownloadPlugin({
        devMode: true, // TODO env variable
      }),
      new CopyPlugin({
        patterns: [
          {
            from: "manifest.json",
            to: distDir,
            context: "public",
            transform(content) {
              // Parse the manifest
              const manifest = JSON.parse(content.toString())

              // Update the version in the manifest file to match the version in package.json
              manifest.version = process.env.npm_package_version

              // add a version name key to distinguish in list of installed extensions
              manifest.version_name = getManifestVersionName(env)

              // Set the dev title and icon because we're doing a dev build
              manifest.name = `${manifest.name} - Dev`
              manifest.action.default_title = `${manifest.action.default_title} - Dev`

              // Return the modified manifest
              return JSON.stringify(manifest, null, 2)
            },
          },
          {
            from: "favicon*-dev*",
            to: ({ absoluteFilename }) =>
              path.join(
                distDir,
                path.basename(absoluteFilename).replace(/-(?:prod|canary|dev)/, "")
              ),
            context: "public",
          },
          {
            from: ".",
            to: distDir,
            context: "public",
            // do not copy the manifest or the favicons, they're handled separately
            globOptions: { ignore: [manifestPath, faviconsSrcPath] },
          },
        ],
      }),
      // new ExtensionReloader({
      //   // avoid reloading every browser tab
      //   // extension pages (dashboard.html, popup.html) are always reloaded
      //   reloadPage: false,
      //   entries: {
      //     // The entries used for the content/background scripts
      //     contentScript: "content_script", // Use the entry names, not the file name or the path
      //     background: "background", // *REQUIRED
      //     extensionPage: ["popup", "onboarding", "dashboard"],
      //   },
      // }),
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

module.exports = config
