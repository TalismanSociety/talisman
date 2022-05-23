/* eslint-env es2021 */
const childProcess = require("child_process")

const getGitShortHash = () => {
  try {
    return (
      process.env.COMMIT_SHA_SHORT ??
      childProcess.execSync("git rev-parse --short HEAD").toString().trim()
    )
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    return process.env.COMMIT_SHA ?? ""
  }
}

module.exports = {
  getGitShortHash: getGitShortHash,
}
