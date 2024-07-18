/* eslint-env es2021 */

const childProcess = require("child_process")
const { readFile } = require("fs/promises")
const path = require("path")
const sentryWebpackPlugin = require("@sentry/webpack-plugin").sentryWebpackPlugin

const rootDir = path.join(__dirname, "..")
const srcDir = path.join(rootDir, "src")

const ValidBrowsers = ["chrome", "firefox"]
const browser = ValidBrowsers.includes(process.env.BROWSER?.toLowerCase())
  ? process.env.BROWSER.toLowerCase()
  : "chrome"
const useOneDistDir = Boolean(process.env.USE_ONE_DIST_DIR)
const distDir = useOneDistDir ? path.join(rootDir, "dist") : path.join(rootDir, "dist", browser)

const publicDir = path.join(rootDir, "public")
const manifestDir = path.join(publicDir, "manifest")

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
      return `talisman_extension_ci_${getGitShortHash() ?? Date.now()}_${browser}.zip`
    case "canary":
      return `talisman_extension_v${
        process.env.npm_package_version
      }_${getGitShortHash()}_canary_${browser}.zip`
    case "production":
      return `talisman_extension_v${process.env.npm_package_version}_${browser}.zip`
    default:
      return `talisman_extension_${getGitShortHash()}_${browser}.zip`
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
      assets: [`${distDir}/**`],
      ignore: [`${distDir}/content_script.js`, `${distDir}/page.js`],
      deleteFilesAfterUpload: [`${distDir}/**/*.map`],
    },
  })
}

const dropConsole = (env) =>
  ["production", "canary"].includes(env.build) && process.env.NODE_ENV !== "TEST"

const updateManifestDetails = async (env, manifest) => {
  const data = await readFile(path.join(manifestDir, `${browser}.json`), "utf-8")
  const browserSpecificManifestDetails = JSON.parse(data)

  // Update the version in the manifest file to match the version in package.json
  manifest.version = process.env.npm_package_version

  // add a version name key to distinguish in list of installed extensions (only for chrome)
  if (browser === "chrome") manifest.version_name = getManifestVersionName(env)

  // Set the dev title and icon if we're doing a dev build
  if (env.build === "dev") {
    manifest.name = `${manifest.name} - Dev`
    manifest.action.default_title = `${manifest.action.default_title} - Dev`
  }
  // Set the canary title and icon if we're doing a canary build
  else if (env.build === "canary") {
    manifest.name = `${manifest.name} - Canary`
    manifest.action.default_title = `${manifest.action.default_title} - Canary`

    for (const key in manifest.icons) {
      const filename = manifest.icons[key]
      const name = filename.split(".").slice(0, -1).join()
      const extension = filename.split(".").slice(-1).join()

      manifest.icons[key] = `${name}-canary.${extension}`
    }
  }

  return { ...manifest, ...browserSpecificManifestDetails }
}

module.exports = {
  browser,
  srcDir,
  distDir,
  publicDir,
  manifestDir,
  updateManifestDetails,
  getGitShortHash,
  getRelease,
  getManifestVersionName,
  getArchiveFileName,
  getSentryPlugin,
  dropConsole,
}
