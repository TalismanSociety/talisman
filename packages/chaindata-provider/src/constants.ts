import { ChainId, EvmNetworkId, TokenId } from "./types"

/** @dev temporarily change branch here when testing changes in chaindata */
const CHAINDATA_BRANCH = "main"

//
// GitHub repo constants
//

export const githubApi = "https://api.github.com"

export const githubChaindataOrg = "TalismanSociety"
export const githubChaindataRepo = "chaindata"
export const githubChaindataBranch = CHAINDATA_BRANCH
export const githubChaindataDistDir = "pub/v1"

export const githubChaindataBaseUrl = `https://raw.githubusercontent.com/${githubChaindataOrg}/${githubChaindataRepo}/${githubChaindataBranch}`
export const githubChaindataDistUrl = `${githubChaindataBaseUrl}/${githubChaindataDistDir}`

export const githubChainsUrl = `${githubChaindataBaseUrl}/data/chaindata.json`
export const githubTestnetChainsUrl = `${githubChaindataBaseUrl}/data/testnets-chaindata.json`
export const githubEvmNetworksUrl = `${githubChaindataBaseUrl}/data/evm-networks.json`

export const githubChaindataChainsAssetsDir = "assets/chains"
export const githubChaindataTokensAssetsDir = "assets/tokens"

export const githubChainLogoUrl = (chainId: ChainId) =>
  `${githubChaindataBaseUrl}/${githubChaindataChainsAssetsDir}/${chainId}.svg`
export const githubEvmNetworkLogoUrl = (networkId: EvmNetworkId) =>
  `${githubChaindataBaseUrl}/${githubChaindataChainsAssetsDir}/${networkId}.svg`
export const githubTokenLogoUrl = (tokenId: TokenId) =>
  `${githubChaindataBaseUrl}/${githubChaindataTokensAssetsDir}/${tokenId}.svg`

export const githubUnknownChainLogoUrl = githubChainLogoUrl("unknown")
export const githubUnknownTokenLogoUrl = githubTokenLogoUrl("unknown")

//
// Chaindata published files (dist folder)
//

export const chaindataChainsAllUrl = `${githubChaindataDistUrl}/chains/all.json`
export const chaindataChainsSummaryUrl = `${githubChaindataDistUrl}/chains/summary.json`
export const chaindataChainByIdUrl = (chainId: string) =>
  `${githubChaindataDistUrl}/chains/byId/${chainId}.json`
export const chaindataChainByGenesisHashUrl = (genesisHash: string) =>
  `${githubChaindataDistUrl}/chains/byGenesisHash/${genesisHash}.json`

export const chaindataEvmNetworksAllUrl = `${githubChaindataDistUrl}/evmNetworks/all.json`
export const chaindataEvmNetworksSummaryUrl = `${githubChaindataDistUrl}/evmNetworks/summary.json`
export const chaindataEvmNetworkByIdUrl = (evmNetworkId: string) =>
  `${githubChaindataDistUrl}/evmNetworks/byId/${evmNetworkId}.json`

export const chaindataTokensAllUrl = `${githubChaindataDistUrl}/tokens/all.json`
export const chaindataTokenByIdUrl = (tokenId: string) =>
  `${githubChaindataDistUrl}/tokens/byId/${tokenId}.json`

export const chaindataMiniMetadatasAllUrl = `${githubChaindataDistUrl}/miniMetadatas/all.json`
