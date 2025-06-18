import { TokenId } from "./chaindata"
import { ChainId, EvmNetworkId } from "./types"

/** @dev temporarily change branch here when testing changes in chaindata */
const CHAINDATA_BRANCH = "feat/chaindata-v4"
const CHAINDATA_PUB_FOLDER = "pub/v4"

//
// GitHub repo constants
//

export const githubApi = "https://api.github.com"
export const githubCdn = "https://raw.githubusercontent.com"

export const githubChaindataOrg = "TalismanSociety"
export const githubChaindataRepo = "chaindata"
export const githubChaindataBranch = CHAINDATA_BRANCH
export const githubChaindataDistDir = CHAINDATA_PUB_FOLDER

export const githubChaindataBaseUrl = `${githubCdn}/${githubChaindataOrg}/${githubChaindataRepo}/${githubChaindataBranch}`
export const githubChaindataDistUrl = `${githubChaindataBaseUrl}/${githubChaindataDistDir}`

export const githubChaindataChainsAssetsDir = "assets/chains"
export const githubChaindataTokensAssetsDir = "assets/tokens"

/** @deprecated */
export const githubChainLogoUrl = (chainId: ChainId) =>
  `${githubChaindataBaseUrl}/${githubChaindataChainsAssetsDir}/${chainId}.svg`
/** @deprecated */
export const githubEvmNetworkLogoUrl = (networkId: EvmNetworkId) =>
  `${githubChaindataBaseUrl}/${githubChaindataChainsAssetsDir}/${networkId}.svg`
/** @deprecated */
export const githubTokenLogoUrl = (tokenId: TokenId) =>
  `${githubChaindataBaseUrl}/${githubChaindataTokensAssetsDir}/${tokenId}.svg`

/** @deprecated */
export const githubUnknownChainLogoUrl = githubChainLogoUrl("unknown")
/** @deprecated */
export const githubUnknownTokenLogoUrl = githubTokenLogoUrl("unknown")

//
// Chaindata published files (dist folder)
//

/** @deprecated */
export const chaindataChainsAllUrl = `${githubChaindataDistUrl}/chains/all.json`
/** @deprecated */
export const chaindataChainsSummaryUrl = `${githubChaindataDistUrl}/chains/summary.json`
/** @deprecated */
export const chaindataChainByIdUrl = (chainId: string) =>
  /** @deprecated */
  `${githubChaindataDistUrl}/chains/byId/${chainId}.json`
/** @deprecated */
export const chaindataChainByGenesisHashUrl = (genesisHash: string) =>
  `${githubChaindataDistUrl}/chains/byGenesisHash/${genesisHash}.json`

/** @deprecated */
export const chaindataEvmNetworksAllUrl = `${githubChaindataDistUrl}/evmNetworks/all.json`
/** @deprecated */
export const chaindataEvmNetworksSummaryUrl = `${githubChaindataDistUrl}/evmNetworks/summary.json`
/** @deprecated */
export const chaindataEvmNetworkByIdUrl = (evmNetworkId: string) =>
  `${githubChaindataDistUrl}/evmNetworks/byId/${evmNetworkId}.json`
/** @deprecated */
export const chaindataTokensAllUrl = `${githubChaindataDistUrl}/tokens/all.json`
/** @deprecated */
export const chaindataTokenByIdUrl = (tokenId: string) =>
  `${githubChaindataDistUrl}/tokens/byId/${tokenId}.json`

/** @deprecated */
export const chaindataMiniMetadatasAllUrl = `${githubChaindataDistUrl}/miniMetadatas/all.json`

// export const CHAINDATA_URL = `${githubChaindataDistUrl}/chaindata.json`
