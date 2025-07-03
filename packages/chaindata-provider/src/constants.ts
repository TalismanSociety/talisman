/** @dev temporarily change branch here when testing changes in chaindata */
const CHAINDATA_BRANCH = "fix/minimetadata-versions"
const CHAINDATA_PUB_FOLDER = "pub/v4"

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
