/* eslint-env es2021 */

require("dotenv").config()

const webpack = require("webpack")
const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const ForkTsCheckerNotifierWebpackPlugin = require("fork-ts-checker-notifier-webpack-plugin")
const EslintWebpackPlugin = require("eslint-webpack-plugin")
const AssetReplacePlugin = require("./AssetReplacePlugin")

const { browser, srcDir, distDir, getRelease, getGitShortHash, dropConsole } = require("./utils")

const config = (env) => ({
  entry: {
    // Wallet ui
    "popup": { import: path.join(srcDir, "index.popup.tsx") },
    "onboarding": { import: path.join(srcDir, "index.onboarding.tsx") },
    "dashboard": { import: path.join(srcDir, "index.dashboard.tsx") },

    // Wallet service worker pages
    "background": { import: path.join(srcDir, "background.ts"), dependOn: "vendor-background" },

    // Background.js manually-specified code-splits (to keep background.js under 4MB).
    // We can't automatically chunk these because we need to manually specify the imports in our extension manifest.
    // Also, `dependOn` seems to break the build (background script doesn't start) when there's more than one entry in it.
    // So, I've daisy-chained each entry to `dependOn` the next.
    "vendor-background": {
      import: ["@metamask/eth-sig-util", "@substrate/txwrapper-core", "dexie"],
    },

    // Wallet injected scripts
    "content_script": { import: path.join(srcDir, "content_script.ts") },
    "page": { import: path.join(srcDir, "page.ts") },
  },
  target: browser === "firefox" ? "web" : "webworker",
  output: {
    path: distDir,
    filename: "[name].js",
    chunkFilename: "[name].chunk.js",
    assetModuleFilename: "assets/[hash][ext]", // removes query string if there are any in our import strings (we use ?url for svgs)
    globalObject: "self",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            // disable type checker - we will use it in fork plugin
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        type: "asset",
        resourceQuery: /url/, // import with 'import x from *.svg?url'
      },
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        resourceQuery: { not: [/url/] }, // exclude react component if *.svg?url
        use: [
          {
            loader: "@svgr/webpack",
            options: {
              exportType: "named",
              dimensions: false,
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|gif)$/i,
        resourceQuery: { not: [/url/] },
        type: "asset",
      },
      {
        test: /\.md$/i,
        use: "raw-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  resolve: {
    alias: {
      "@common": path.resolve(srcDir, "common/"),
      "@talisman": path.resolve(srcDir, "@talisman/"),
      "@ui": path.resolve(srcDir, "ui/"),
      "@extension/core": path.resolve(srcDir, "../../../packages/extension-core/src/"),
      "@extension/shared": path.resolve(srcDir, "../../../packages/extension-shared/src/"),
      // https://github.com/facebook/react/issues/20235
      // fix for @polkadot/react-identicons which uses react 16
      "react/jsx-runtime": path.resolve("../../node_modules/react/jsx-runtime.js"),
      // dexie uses `dist/modern/dexie.min.mjs` in production, which makes for terrible sourcemaps
      "dexie": path.resolve("../../node_modules/dexie/dist/modern/dexie.mjs"),
    },
    extensions: [".ts", ".tsx", ".js", ".css"],
    fallback: {
      stream: false,
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      assert: require.resolve("assert"),
      url: require.resolve("url"),
      crypto: require.resolve("crypto-browserify"),
      zlib: require.resolve("browserify-zlib"),
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      // passthroughs from the environment

      // NOTE: This EXTENSION_PREFIX must be an empty `""`.
      // The `BaseStore` which the `AccountsStore` in `@polkadot/keyring` extends uses this as a prefix for localstorage keys.
      // If it's set to something like `talisman`, then the keys which should be at `account:0x...` will instead be located
      // at `talismanaccounts:accounts:0x...`.
      "process.env.EXTENSION_PREFIX": JSON.stringify(""),
      "process.env.PORT_PREFIX": JSON.stringify(process.env.PORT_PREFIX || "talisman"),
      "process.env.NODE_DEBUG": JSON.stringify(process.env.NODE_DEBUG || ""),
      "process.env.POSTHOG_AUTH_TOKEN": JSON.stringify(process.env.POSTHOG_AUTH_TOKEN || ""),
      "process.env.API_KEY_ONFINALITY": JSON.stringify(
        env.build === "production" ? process.env.API_KEY_ONFINALITY || "" : ""
      ),
      "process.env.SENTRY_AUTH_TOKEN": JSON.stringify(process.env.SENTRY_AUTH_TOKEN || ""),
      "process.env.SENTRY_DSN": JSON.stringify(process.env.SENTRY_DSN || ""),
      "process.env.SIMPLE_LOCALIZE_API_KEY": JSON.stringify(
        process.env.SIMPLE_LOCALIZE_API_KEY || ""
      ),
      "process?.env?.TXWRAPPER_METADATA_CACHE_MAX": undefined,
      "process.env.TXWRAPPER_METADATA_CACHE_MAX_AGE": JSON.stringify(60 * 1000),

      // dev stuff, only pass through when env.build is undefined (running a development build)
      "process.env.PASSWORD": JSON.stringify(
        env.build === undefined ? process.env.PASSWORD || "" : ""
      ),
      "process.env.TEST_MNEMONIC": JSON.stringify(
        env.build === undefined ? process.env.TEST_MNEMONIC || "" : ""
      ),
      "process.env.EVM_LOGPROXY": JSON.stringify(
        env.build === undefined ? process.env.EVM_LOGPROXY || "" : ""
      ),
      "process.env.COINGECKO_API_URL": JSON.stringify(
        env.build === undefined ? process.env.COINGECKO_API_URL || "" : ""
      ),
      "process.env.COINGECKO_API_KEY_NAME": JSON.stringify(
        env.build === undefined ? process.env.COINGECKO_API_KEY_NAME || "" : ""
      ),
      "process.env.COINGECKO_API_KEY_VALUE": JSON.stringify(
        env.build === undefined ? process.env.COINGECKO_API_KEY_VALUE || "" : ""
      ),
      "process.env.BLOWFISH_BASE_PATH": JSON.stringify(
        env.build === undefined ? process.env.BLOWFISH_BASE_PATH || "" : ""
      ),
      // prod build doesn't need an api key
      // dev builds need one that should not change often
      // canary/ci/qa builds need one that can be rotated easily and without impacting developers
      "process.env.BLOWFISH_API_KEY": JSON.stringify(
        env.build === undefined
          ? process.env.BLOWFISH_API_KEY || ""
          : ["canary", "ci", "qa"].includes(env.build)
          ? process.env.BLOWFISH_QA_API_KEY || ""
          : ""
      ),

      // computed values
      "process.env.DEBUG": JSON.stringify(String(!dropConsole(env))),
      "process.env.BUILD": JSON.stringify(env.build),
      "process.env.COMMIT_SHA_SHORT": JSON.stringify(getGitShortHash()),
      "process.env.RELEASE": JSON.stringify(getRelease(env)),
      "process.env.VERSION": JSON.stringify(process.env.npm_package_version),
      "process.env.BROWSER": JSON.stringify(browser),
    }),
    ...[
      { title: "Talisman", entrypoint: "popup" },
      { title: "Talisman Wallet", entrypoint: "dashboard" },
      { title: "Unlock the Talisman", entrypoint: "onboarding" },
    ].map(
      ({ title, entrypoint }) =>
        new HtmlWebpackPlugin({
          template: `src/template.${entrypoint}.html`,
          filename: `${entrypoint}.html`,
          chunks: [entrypoint],
          title,
          inject: "body",
          minify: false,
        })
    ),
    new CaseSensitivePathsPlugin(),
    new ForkTsCheckerWebpackPlugin(),
    new ForkTsCheckerNotifierWebpackPlugin({ title: "TypeScript", excludeWarnings: false }),
    new EslintWebpackPlugin({ context: "../", extensions: ["ts", "tsx"] }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    // inline page.js inside content_script.js
    new AssetReplacePlugin({
      "#TALISMAN_PAGE_SCRIPT#": "page",
    }),
  ],
})

module.exports = config
