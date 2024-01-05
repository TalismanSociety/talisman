import { Address } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"

export type DiscoveredBalance = {
  id: string
  address: Address
  tokenId: TokenId
  balance: string
}

export enum AssetDiscoveryMode {
  ALL_NETWORKS = "ALL_NETWORKS",
  ACTIVE_NETWORKS = "ACTIVE_NETWORKS",
}

export type RequestAssetDiscoveryStartScan = {
  mode: AssetDiscoveryMode
  addresses?: Address[]
}

export interface AssetDiscoveryMessages {
  "pri(assetDiscovery.scan.start)": [RequestAssetDiscoveryStartScan, boolean]
  "pri(assetDiscovery.scan.stop)": [null, boolean]
}
