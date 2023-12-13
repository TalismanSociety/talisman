import { Address } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"

export type DiscoveredBalance = {
  id: string
  address: Address
  tokenId: TokenId
  balance: string
}

export type RequestAssetDiscoveryStartScan = {
  full: boolean
}

export interface AssetDiscoveryMessages {
  "pri(assetDiscovery.scan.start)": [RequestAssetDiscoveryStartScan, boolean]
  "pri(assetDiscovery.scan.stop)": [null, boolean]
}
