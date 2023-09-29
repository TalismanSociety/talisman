import { BalancesConfig, BalancesMetadata, ChainId } from "./Chain"
import { TokenId } from "./Token"

export type EvmNetworkList = Record<EvmNetworkId, EvmNetwork | CustomEvmNetwork>

export type EvmNetworkId = string
export type EvmNetwork = {
  id: EvmNetworkId
  isTestnet: boolean
  sortIndex: number | null
  name: string | null
  themeColor: string | null
  logo: string | null
  // TODO: Create ethereum tokens store (and reference here by id).
  //       Or extend substrate tokens store to support both substrate and ethereum tokens.
  nativeToken: { id: TokenId } | null
  // TODO remove tokens property, as tokens already reference their network
  tokens: Array<{ id: TokenId }> | null
  explorerUrl: string | null
  rpcs: Array<EthereumRpc> | null
  substrateChain: { id: ChainId } | null

  balancesConfig: Array<BalancesConfig>
  // TODO: Delete (has its own store now)
  /** @deprecated has its own store now */
  balancesMetadata: Array<BalancesMetadata>
}
export type CustomEvmNetwork = EvmNetwork & {
  isCustom: true
  explorerUrls: string[]
  iconUrls: string[]
}

export type EthereumRpc = {
  url: string // The url of this ethereum RPC
}
