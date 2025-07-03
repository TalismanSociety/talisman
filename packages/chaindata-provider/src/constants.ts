/** @dev temporarily change branch here when testing changes in chaindata */
const CHAINDATA_BRANCH = "fix/minimetadata-versions"

// pub subfolder needs to be incremented each time the schema of chaindata changes, or when the content of the minimetadata changes
const CHAINDATA_PUB_FOLDER = "pub/v4"

export const MINIMETADATA_VERSION = CHAINDATA_PUB_FOLDER.split("/").pop()

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
