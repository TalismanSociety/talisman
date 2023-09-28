import { ChainId, EvmNetworkId, TokenId } from "./types"

//
// Chaindata (Published to GitHub Pages) Constants
//

export const chaindataUrl = "https://talismansociety.github.io/chaindata"

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

//
// GitHub Repo Constants
//

export const githubChaindataBranch = "main"
export const githubChaindataBaseUrl = `https://raw.githubusercontent.com/TalismanSociety/chaindata/${githubChaindataBranch}`

export const githubChainsUrl = `${githubChaindataBaseUrl}/chaindata.json`
export const githubTestnetChainsUrl = `${githubChaindataBaseUrl}/testnets-chaindata.json`
export const githubEvmNetworksUrl = `${githubChaindataBaseUrl}/evm-networks.json`

export const githubChainLogoUrl = (chainId: ChainId) =>
  `${githubChaindataBaseUrl}/assets/chains/${chainId}.svg`
export const githubEvmNetworkLogoUrl = (networkId: EvmNetworkId) =>
  `${githubChaindataBaseUrl}/assets/chains/${networkId}.svg`
export const githubTokenLogoUrl = (tokenId: TokenId) =>
  `${githubChaindataBaseUrl}/assets/tokens/${tokenId}.svg`

export const githubUnknownChainLogoUrl = githubChainLogoUrl("unknown")
export const githubUnknownTokenLogoUrl = githubTokenLogoUrl("unknown")
