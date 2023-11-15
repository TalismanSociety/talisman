import { ChainId, EvmNetworkId, TokenId } from "./types"

export const githubChaindataBranch = "v3"
export const githubChaindataBaseUrl = `https://raw.githubusercontent.com/TalismanSociety/chaindata/${githubChaindataBranch}`

export const githubChainsUrl = `${githubChaindataBaseUrl}/chaindata.json`
export const githubTestnetChainsUrl = `${githubChaindataBaseUrl}/testnets-chaindata.json`
export const githubEvmNetworksUrl = `${githubChaindataBaseUrl}/evm-networks.json`
export const githubTokensUrl = `${githubChaindataBaseUrl}/tokens.json`

export const githubChainLogoUrl = (chainId: ChainId) =>
  `${githubChaindataBaseUrl}/assets/chains/${chainId}.svg`
export const githubEvmNetworkLogoUrl = (networkId: EvmNetworkId) =>
  `${githubChaindataBaseUrl}/assets/chains/${networkId}.svg`
export const githubTokenLogoUrl = (tokenId: TokenId) =>
  `${githubChaindataBaseUrl}/assets/tokens/${tokenId}.svg`

export const githubUnknownChainLogoUrl = githubChainLogoUrl("unknown")
export const githubUnknownTokenLogoUrl = githubTokenLogoUrl("unknown")
