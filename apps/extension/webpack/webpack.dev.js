/* eslint-env es2021 */

const { merge } = require("webpack-merge")
const common = require("./webpack.common.js")
const path = require("path")
const CopyPlugin = require("copy-webpack-plugin")
// const ExtensionReloader = require("@alectalisman/webpack-ext-reloader")
const { SourceMapDevToolPlugin } = require("webpack")
const SimpleLocalizeDownloadPlugin = require("./plugins/SimpleLocalizeDownloadPlugin")
const startCase = require("lodash/startCase.js")

const { updateManifestDetails, browser, distDir, manifestDir } = require("./utils.js")

const faviconsSrcPath = path.join(__dirname, "..", "public", "favicon*.*")

console.log(`Building for ${startCase(browser)} with dev config `)

/** @type { import('webpack').Configuration } */
const config = (env) =>
  merge(common(env), {
    devtool: false,
    mode: "development",
    watchOptions: {
      ignored: ["**/node_modules", "**/dist", "apps/extension/public/locales"],
    },
    plugins: [
      new SourceMapDevToolPlugin({
        // Here we are using a negative look-behind to exclude the `eval()` devtool from content_script.ts and page.ts.
        //
        // If either of these scripts have `eval` in them, the wallet will be unable to inject on dapps with a good
        // content security policy, like https://app.uniswap.org/swap for example.
        test: /(?<!(content_script|page))\.(ts|js|mts|mjs)/,
      }),
      new SimpleLocalizeDownloadPlugin({
        devMode: true, // TODO env variable
      }),
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
            globOptions: {
              ignore: [manifestDir, faviconsSrcPath].concat(
                // service worker should be excluded for firefox
                browser === "firefox" ? ["service_worker.js"] : []
              ),
            },
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
    ],
  })

module.exports = config
