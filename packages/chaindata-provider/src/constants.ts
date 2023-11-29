import { ChainId, EvmNetworkId, TokenId } from "./types"

// @dev : temporarily change branch here when testing changes in chaindata
const CHAINDATA_BRANCH = "main"

//
// Chaindata published files (dist folder)
//

export const chaindataUrl = `https://raw.githubusercontent.com/TalismanSociety/chaindata/${CHAINDATA_BRANCH}/dist`

export const chaindataChainsAllUrl = `${chaindataUrl}/chains/all.json`
export const chaindataChainsSummaryUrl = `${chaindataUrl}/chains/summary.json`
export const chaindataChainByIdUrl = (chainId: string) =>
  `${chaindataUrl}/chains/byId/${chainId}.json`
export const chaindataChainByGenesisHashUrl = (genesisHash: string) =>
  `${chaindataUrl}/chains/byGenesisHash/${genesisHash}.json`

export const chaindataEvmNetworksAllUrl = `${chaindataUrl}/evmNetworks/all.json`
export const chaindataEvmNetworksSummaryUrl = `${chaindataUrl}/evmNetworks/summary.json`
export const chaindataEvmNetworkByIdUrl = (evmNetworkId: string) =>
  `${chaindataUrl}/evmNetworks/byId/${evmNetworkId}.json`

export const chaindataTokensAllUrl = `${chaindataUrl}/tokens/all.json`
export const chaindataTokenByIdUrl = (tokenId: string) =>
  `${chaindataUrl}/tokens/byId/${tokenId}.json`

export const chaindataMiniMetadatasAllUrl = `${chaindataUrl}/miniMetadatas/all.json`

//
// GitHub Repo Constants
//

export const githubApi = "https://api.github.com"

export const githubChaindataOrg = "TalismanSociety"
export const githubChaindataRepo = "chaindata"
export const githubChaindataBranch = CHAINDATA_BRANCH

export const githubChaindataBaseUrl = `https://raw.githubusercontent.com/${githubChaindataOrg}/${githubChaindataRepo}/${githubChaindataBranch}`

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
