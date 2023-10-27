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

const { srcDir, coreDir, distDir, getRelease, getGitShortHash } = require("./utils")

const config = (env) => ({
  entry: {
    // Wallet ui
    "popup": { import: path.join(srcDir, "index.popup.tsx") },
    "onboarding": { import: path.join(srcDir, "index.onboarding.tsx") },
    "dashboard": { import: path.join(srcDir, "index.dashboard.tsx") },

    // Wallet service workers
    "background": { import: path.join(coreDir, "background.ts"), dependOn: "vendor-background" },

    // Background.js manually-specified code-splits (to keep background.js under 4MB)
    "vendor-background": [
      "@substrate/txwrapper-core",
      "@talismn/chaindata-provider-extension",
      "@metamask/eth-sig-util",
      "@acala-network/types",
      "@acala-network/eth-providers",
      "@acala-network/eth-transactions",
      "@acala-network/api-derive",
    ],

    // Wallet injected scripts
    "content_script": path.join(coreDir, "content_script.ts"),
    "page": path.join(coreDir, "page.ts"),
  },
  output: {
    path: distDir,
    filename: "[name].js",
    chunkFilename: "[name].chunk.js",
    assetModuleFilename: "assets/[hash][ext]", // removes query string if there are any in our import strings (we use ?url for svgs)
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
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  resolve: {
    alias: {
      "@talisman": path.resolve(srcDir, "@talisman/"),
      "@core": path.resolve(srcDir, "core/"),
      "@ui": path.resolve(srcDir, "ui/"),
      // https://github.com/facebook/react/issues/20235
      // fix for @polkadot/react-identicons which uses react 16
      "react/jsx-runtime": path.resolve("../../node_modules/react/jsx-runtime.js"),
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
      "process.env.EXTENSION_PREFIX": JSON.stringify(""), // this env var MUST be set, however if it has a value the keyring will break
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

      // computed values
      "process.env.BUILD": JSON.stringify(env.build),
      "process.env.COMMIT_SHA_SHORT": JSON.stringify(getGitShortHash()),
      "process.env.RELEASE": JSON.stringify(getRelease(env)),
      "process.env.VERSION": JSON.stringify(process.env.npm_package_version),
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
