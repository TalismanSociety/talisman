/** @dev temporarily change branch here when testing changes in chaindata */
const CHAINDATA_BRANCH = "feat/chaindata-v12" // TODO CHANGE BACK TO "main" BEFORE MERGING THE PR

// pub subfolder needs to be incremented each time the schema of chaindata changes, or when the content of the minimetadata changes
export const CHAINDATA_PUB_FOLDER = "pub/v12"

export const MINIMETADATA_VERSION = CHAINDATA_PUB_FOLDER.split("/").pop()!
if (!MINIMETADATA_VERSION) {
  throw new Error("MINIMETADATA_VERSION is not defined, please check CHAINDATA_PUB_FOLDER")
}

//
// GitHub repo constants
//

const githubCdn = "https://raw.githubusercontent.com"

const githubChaindataOrg = "TalismanSociety"
const githubChaindataRepo = "chaindata"
const githubChaindataBranch = CHAINDATA_BRANCH
const githubChaindataDistDir = CHAINDATA_PUB_FOLDER

export const githubChaindataBaseUrl = `${githubCdn}/${githubChaindataOrg}/${githubChaindataRepo}/${githubChaindataBranch}`
export const githubChaindataDistUrl = `${githubChaindataBaseUrl}/${githubChaindataDistDir}`

export const githubChaindataTokensAssetsDir = "assets/tokens"
