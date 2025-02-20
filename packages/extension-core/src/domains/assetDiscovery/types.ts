import { Address } from "@talismn/balances"
import { ChainId, EvmNetworkId, TokenId } from "@talismn/chaindata-provider"

export type DiscoveredBalance = {
  id: string
  address: Address
  tokenId: TokenId
  balance: string
}

export type AssetDiscoveryScanScope = {
  networkIds: (EvmNetworkId | ChainId)[]
  addresses: Address[]
}

export interface AssetDiscoveryMessages {
  "pri(assetDiscovery.scan.start)": [AssetDiscoveryScanScope, boolean]
  "pri(assetDiscovery.scan.stop)": [null, boolean]
}
