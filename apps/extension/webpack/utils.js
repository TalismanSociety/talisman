/* eslint-env es2021 */

const childProcess = require("child_process")
const path = require("path")
const sentryWebpackPlugin = require("@sentry/webpack-plugin").sentryWebpackPlugin

const rootDir = path.join(__dirname, "..")
const srcDir = path.join(rootDir, "src")
const distDirChrome = path.join(rootDir, "dist", "chrome")
const distDirFirefox = path.join(rootDir, "dist", "firefox")

// distDirShared is used for the shared files between the two builds.
// Files from this directory are copied ino the respective build directories for each browser
// and then deleted
const distDirShared = path.join(rootDir, "dist", "temp")
const publicDir = path.join(rootDir, "public")

const getGitShortHash = () => {
  try {
    return (
      process.env.COMMIT_SHA_SHORT ??
      childProcess.execSync("git rev-parse --short HEAD").toString().trim()
    )
  } catch (error) {
    const fallback = process.env.COMMIT_SHA ?? ""
    // eslint-disable-next-line no-console
    console.error(`Failed to get git short hash, using '${fallback}' as fallback`, error)
    return fallback
  }
}

const getRelease = (env) => {
  if (env.build === "production") return process.env.npm_package_version
  return getGitShortHash()
}

const getArchiveFileName = (env) => {
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

const getManifestVersionName = (env) => {
  switch (env.build) {
    case "ci":
      return `${process.env.npm_package_version} - ${getGitShortHash() ?? Date.now()} ci`
    case "canary":
      return `${process.env.npm_package_version} - ${getGitShortHash()}`
    case "production":
      return process.env.npm_package_version
    case "qa":
      return `${process.env.npm_package_version} - ${getGitShortHash()}`
    default:
      return `${process.env.npm_package_version} - ${getGitShortHash()} dev`
  }
}

const getSentryPlugin = (env) => {
  if (!["production", "canary"].includes(env.build)) return

  // only the person or bot that builds for store release should have an auth token
  if (!process.env.SENTRY_AUTH_TOKEN) {
    console.warn("Missing SENTRY_AUTH_TOKEN env variable, release won't be uploaded to Sentry")
    return
  }

  return sentryWebpackPlugin({
    // see https://docs.sentry.io/product/cli/configuration/ for details
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: "talisman",
    project: "talisman-extension",
    release: getRelease(env),
    cleanArtifacts: true,
    sourcemaps: {
      assets: [`${distDirShared}/**`],
      ignore: [`${distDirShared}/content_script.js`, `${distDirShared}/page.js`],
      deleteFilesAfterUpload: [`${distDirShared}/**/*.map`],
    },
  })
}

const dropConsole = (env) =>
  ["production", "canary"].includes(env.build) && process.env.NODE_ENV !== "TEST"

const browserSpecificManifestDetails = {
  firefox: {
    background: {
      scripts: ["./vendor-background.js", "./background.js"],
    },
    browser_specific_settings: {
      gecko: {
        strict_min_version: "95.0",
      },
    },
  },
  chrome: {
    background: {
      service_worker: "service_worker.js",
    },
    minimum_chrome_version: "102",
  },
}

module.exports = {
  srcDir,
  distDirShared,
  distDirChrome,
  distDirFirefox,
  publicDir,
  browserSpecificManifestDetails,
  getGitShortHash,
  getRelease,
  getManifestVersionName,
  getArchiveFileName,
  getSentryPlugin,
  dropConsole,
}
