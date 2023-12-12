import { Address } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"

export type AssetDiscoveryResult = {
  id: string
  address: Address
  tokenId: TokenId
  balance: string | null
  status: "pending" | "success" | "error"
  // timestamp: number
}

export type RequestAssetDiscoveryStartScan = {
  full: boolean
}

export interface AssetDiscoveryMessages {
  "pri(assetDiscovery.scan.start)": [RequestAssetDiscoveryStartScan, boolean]
  "pri(assetDiscovery.scan.stop)": [null, boolean]
}
