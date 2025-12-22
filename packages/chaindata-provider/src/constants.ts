/** @dev temporarily change branch here when testing changes in chaindata */
const CHAINDATA_BRANCH = "main"

// pub subfolder needs to be incremented each time the schema of chaindata changes, or when the content of the minimetadata changes
const CHAINDATA_PUB_FOLDER = "pub/v8"

export const MINIMETADATA_VERSION = CHAINDATA_PUB_FOLDER.split("/").pop()!
if (!MINIMETADATA_VERSION) {
  throw new Error("MINIMETADATA_VERSION is not defined, please check CHAINDATA_PUB_FOLDER")
}

//
// GitHub repo constants
//

export const githubCdn = "https://raw.githubusercontent.com"

export const githubChaindataOrg = "TalismanSociety"
export const githubChaindataRepo = "chaindata"
export const githubChaindataBranch = CHAINDATA_BRANCH
export const githubChaindataDistDir = CHAINDATA_PUB_FOLDER

export const githubChaindataBaseUrl = `${githubCdn}/${githubChaindataOrg}/${githubChaindataRepo}/${githubChaindataBranch}`
export const githubChaindataDistUrl = `${githubChaindataBaseUrl}/${githubChaindataDistDir}`

export const githubChaindataChainsAssetsDir = "assets/chains"
export const githubChaindataTokensAssetsDir = "assets/tokens"
