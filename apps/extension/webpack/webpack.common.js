/* eslint-env es2021 */

require("dotenv").config()

const webpack = require("webpack")
const path = require("path")
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin")
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const ForkTsCheckerNotifierWebpackPlugin = require("fork-ts-checker-notifier-webpack-plugin")
const EslintWebpackPlugin = require("eslint-webpack-plugin")

const {
  browser,
  srcDir,
  distDir,
  getRelease,
  getGitShortHash,
  getSupportedLanguages,
} = require("./utils")

/** @type { import('webpack').Configuration } */
const config = (env) => ({
  entry: {
    // Wallet ui
    "popup": { import: path.join(srcDir, "index.popup.tsx") },
    "onboarding": { import: path.join(srcDir, "index.onboarding.tsx") },
    "dashboard": { import: path.join(srcDir, "index.dashboard.tsx") },
    "support": { import: path.join(srcDir, "index.support.tsx") },

    // Wallet service worker pages
    "background": { import: path.join(srcDir, "background.ts"), dependOn: "vendor-background" },

    // Background.js manually-specified code-splits (to keep background.js under 4MB).
    // We can't automatically chunk these because we need to manually specify the imports in our extension manifest.
    // Also, `dependOn` seems to break the build (background script doesn't start) when there's more than one entry in it.
    // So, I've daisy-chained each entry to `dependOn` the next.
    "vendor-background": {
      import: [
        "@metamask/eth-sig-util",
        "@substrate/txwrapper-core",
        "dexie",
        "@metaplex-foundation/umi",
        "@metaplex-foundation/mpl-token-metadata",
        "toml",
        "elliptic",
      ],
    },

    // Wallet injected scripts
    "content_script": { import: path.join(srcDir, "content_script.ts") },
    "page": { import: path.join(srcDir, "page.ts") },
  },
  // target: browser === "firefox" ? "web" : "webworker",
  output: {
    path: distDir,
    filename: "[name].js",
    chunkFilename: "chunk.[name].js",
    assetModuleFilename: "assets/[hash][ext]", // removes query string if there are any in our import strings (we use ?url for svgs)
    globalObject: "self",
  },
  stats: "minimal",
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "esbuild-loader",
          options: { target: "esnext" },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        type: "asset",
        resourceQuery: /url/, // import with 'import x from *.svg?url'
        exclude: /node_modules/,
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
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpg|gif)$/i,
        resourceQuery: { not: [/url/] },
        type: "asset",
        exclude: /node_modules/,
      },
      {
        test: /\.md$/i,
        use: "raw-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          { loader: "style-loader" },
          // no tailwind / postcss on css files inside of node_modules
          { loader: "css-loader", options: { sourceMap: false, url: false, import: false } },
        ],
        include: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          { loader: "style-loader" },
          { loader: "css-loader", options: { sourceMap: false, url: false, import: false } },
          { loader: "postcss-loader", options: { sourceMap: false } },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    alias: {
      // https://github.com/facebook/react/issues/20235
      // fix for @polkadot/react-identicons which uses react 16
      "react/jsx-runtime": path.resolve("../../node_modules/react/jsx-runtime.js"),
      // dexie uses `dist/modern/dexie.min.mjs` in production, which makes for terrible sourcemaps
      "dexie": path.resolve("../../node_modules/dexie/dist/modern/dexie.mjs"),
    },
    extensions: [".ts", ".tsx", ".js", ".css"],
    /** Brings in our @common/@ui/etc paths from tsconfig.json's compilerOptions.paths property  */
    plugins: [new TsconfigPathsPlugin()],
    fallback: {
      stream: false,
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      assert: require.resolve("assert"),
      url: require.resolve("url"),
      crypto: require.resolve("crypto-browserify"),
      zlib: require.resolve("browserify-zlib"),
      vm: require.resolve("vm-browserify"),
    },
  },
  plugins: [
    env.build !== "ci" && new webpack.ProgressPlugin(),
    Boolean(process.env.MEASURE_WEBPACK_SPEED) &&
      new SpeedMeasurePlugin({ outputFormat: "humanVerbose" }),
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
      "process.env.SENTRY_AUTH_TOKEN": JSON.stringify(process.env.SENTRY_AUTH_TOKEN || ""),
      "process.env.SENTRY_DSN": JSON.stringify(process.env.SENTRY_DSN || ""),
      "process.env.SIMPLE_LOCALIZE_API_KEY": JSON.stringify(
        process.env.SIMPLE_LOCALIZE_API_KEY || "",
      ),
      "process.env.TXWRAPPER_METADATA_CACHE_MAX_AGE": JSON.stringify(60 * 1000),

      // dev stuff, only pass through when env.build is undefined (running a development build)
      "process.env.PASSWORD": JSON.stringify(env.build === "dev" ? process.env.PASSWORD || "" : ""),
      "process.env.TEST_MNEMONIC": JSON.stringify(
        env.build === "dev" ? process.env.TEST_MNEMONIC || "" : "",
      ),
      "process.env.EVM_LOGPROXY": JSON.stringify(
        env.build === "dev" ? process.env.EVM_LOGPROXY || "" : "",
      ),
      "process.env.TAOSTATS_BASE_PATH": JSON.stringify(
        env.build === "dev" ? process.env.TAOSTATS_BASE_PATH || "" : "",
      ),
      "process.env.LOG_SUBSCRIPTION_CALLBACKS": JSON.stringify(
        env.build === "dev" || ["canary", "ci", "qa"].includes(env.build)
          ? process.env.LOG_SUBSCRIPTION_CALLBACKS || ""
          : "",
      ),
      // computed values
      "process.env.DEBUG": JSON.stringify(
        String(
          // DEBUG is true when:
          // 1. env.build is neither production nor canary, or
          !["production", "canary"].includes(env.build) ||
            // 2. when NODE_ENV is TEST
            process.env.NODE_ENV === "TEST",
        ),
      ),
      "process.env.BUILD": JSON.stringify(env.build),
      "process.env.COMMIT_SHA_SHORT": JSON.stringify(getGitShortHash()),
      "process.env.RELEASE": JSON.stringify(getRelease(env)),
      "process.env.VERSION": JSON.stringify(process.env.npm_package_version),
      "process.env.BROWSER": JSON.stringify(browser),
      "process.env.SUPPORTED_LANGUAGES": JSON.stringify(getSupportedLanguages()),
    }),
    ...[
      { title: "Talisman", entrypoint: "popup" },
      { title: "Talisman Wallet", entrypoint: "dashboard" },
      { title: "Unlock the Talisman", entrypoint: "onboarding" },
      { title: "Support Operations", entrypoint: "support" },
    ].map(
      ({ title, entrypoint }) =>
        new HtmlWebpackPlugin({
          template: `src/template.${entrypoint}.html`,
          filename: `${entrypoint}.html`,
          chunks: [entrypoint],
          title,
          inject: "body",
          minify: false,
        }),
    ),
    new CaseSensitivePathsPlugin(),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        memoryLimit: 4096, // defaults to 2048, on some machines it is insufficient and causes errors when making change to backend
      },
    }),
    new ForkTsCheckerNotifierWebpackPlugin({
      title: "TypeScript",
      excludeWarnings: false,
    }),
    new EslintWebpackPlugin({ context: "../", extensions: ["ts", "tsx"] }),
    new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }),
  ],
})

module.exports = config
