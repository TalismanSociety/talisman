/* eslint-env es2021 */

const childProcess = require("child_process")
const path = require("path")
const SentryWebpackPlugin = require("@sentry/webpack-plugin")

const srcDir = path.join(__dirname, "..", "src")
const coreDir = path.join(srcDir, "core")
const distDir = path.join(__dirname, "..", "dist")

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

  return new SentryWebpackPlugin({
    // see https://docs.sentry.io/product/cli/configuration/ for details
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: "talisman",
    project: "talisman-extension",
    release: getRelease(env),
    include: distDir,
    ignore: ["content_script.js", "page.js"],
    cleanArtifacts: true,
  })
}

module.exports = {
  srcDir,
  coreDir,
  distDir,
  getGitShortHash,
  getRelease,
  getManifestVersionName,
  getArchiveFileName,
  getSentryPlugin,
}
