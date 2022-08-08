/* eslint-env es2021 */

require("dotenv").config()

const webpack = require("webpack")
const path = require("path")
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const ForkTsCheckerNotifierWebpackPlugin = require("fork-ts-checker-notifier-webpack-plugin")
const EslintWebpackPlugin = require("eslint-webpack-plugin")
const createStyledComponentsTransformer = require("typescript-plugin-styled-components").default
const styledComponentsTransformer = createStyledComponentsTransformer()

const { srcDir, coreDir, distDir, getRelease, getGitShortHash } = require("./utils")

const config = (env) => ({
  entry: {
    substrate: ["@substrate/txwrapper-polkadot"],
    popup: { import: path.join(srcDir, "index.popup.tsx") },
    onboarding: { import: path.join(srcDir, "index.onboarding.tsx") },
    dashboard: { import: path.join(srcDir, "index.dashboard.tsx") },
    background: { import: path.join(coreDir, "background.ts"), dependOn: "substrate" },
    content_script: path.join(coreDir, "content_script.ts"),
    page: path.join(coreDir, "page.ts"),
  },
  output: {
    path: distDir,
    filename: "[name].js",
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            getCustomTransformers: () => ({ before: [styledComponentsTransformer] }),
            // disable type checker - we will use it in fork plugin
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: [
          {
            loader: "@svgr/webpack",
            options: {
              exportType: "named",
              dimensions: false,
            },
          },
          {
            loader: "url-loader",
          },
        ],
      },
      {
        test: /\.(png|jpg|gif)$/i,
        dependency: { not: ["url"] },
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 8192,
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    alias: {
      "@talisman": path.resolve(srcDir, "@talisman/"),
      "@core": path.resolve(srcDir, "core/"),
      "@ui": path.resolve(srcDir, "ui/"),
      //"styled-components": path.resolve(__dirname, "../../..", "node_modules", "styled-components"), // prevents duplication of styled components https://styled-components.com/docs/faqs#why-am-i-getting-a-warning-about-several-instances-of-module-on-the-page
      // https://github.com/facebook/react/issues/20235
      // fix for @polkadot/react-identicons which uses react 16
      "react/jsx-runtime": path.resolve("../../node_modules/react/jsx-runtime.js"),
    },
    extensions: [".ts", ".tsx", ".js", ".css"],
    fallback: {
      stream: false,
      assert: require.resolve("assert"),
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      // passthroughs from the environment
      "process.env.EXTENSION_PREFIX": JSON.stringify(process.env.EXTENSION_PREFIX || ""),
      "process.env.NODE_DEBUG": JSON.stringify(process.env.NODE_DEBUG || ""),
      "process.env.POSTHOG_AUTH_TOKEN": JSON.stringify(process.env.POSTHOG_AUTH_TOKEN || ""),
      "process.env.SENTRY_AUTH_TOKEN": JSON.stringify(process.env.SENTRY_AUTH_TOKEN || ""),
      "process.env.SENTRY_DSN": JSON.stringify(process.env.SENTRY_DSN || ""),

      // dev-only passthroughs from the environment
      "process.env.PASSWORD": JSON.stringify(
        // only pass through when env.build is undefined (running a development build)
        env.build === undefined ? process.env.PASSWORD || "" : ""
      ),
      "process.env.TEST_MNEMONIC": JSON.stringify(
        // only pass through when env.build is undefined (running a development build)
        env.build === undefined ? process.env.TEST_MNEMONIC || "" : ""
      ),
      "process.env.EVM_LOGPROXY": JSON.stringify(
        // only pass through when env.build is undefined (running a development build)
        env.build === undefined ? process.env.EVM_LOGPROXY || "" : ""
      ),

      // computed values
      "process.env.BUILD": JSON.stringify(env.build),
      "process.env.COMMIT_SHA_SHORT": JSON.stringify(getGitShortHash()),
      "process.env.RELEASE": JSON.stringify(getRelease(env)),
      "process.env.VERSION": JSON.stringify(process.env.npm_package_version),
    }),
    new CaseSensitivePathsPlugin(),
    new ForkTsCheckerWebpackPlugin(),
    new ForkTsCheckerNotifierWebpackPlugin({ title: "TypeScript", excludeWarnings: false }),
    new EslintWebpackPlugin({ context: "../", extensions: ["ts", "tsx"] }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
  ],
})

module.exports = config
