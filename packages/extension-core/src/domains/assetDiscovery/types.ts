import { Address } from "@talismn/balances"
import { NetworkId, TokenId } from "@talismn/chaindata-provider"

export type DiscoveredBalance = {
  id: string
  address: Address
  tokenId: TokenId
  balance: string
}

export type AssetDiscoveryScanScope = {
  networkIds: NetworkId[]
  addresses: Address[]
  /** indicates whether aad api should be called at the begining of the scan */
  withApi: boolean
}

export interface AssetDiscoveryMessages {
  "pri(assetDiscovery.scan.start)": [AssetDiscoveryScanScope, boolean]
  "pri(assetDiscovery.scan.stop)": [null, boolean]
}
