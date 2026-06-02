import type { Balances } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"

// the system that handles an opportunity (yield.xyz aggregator vs the seek staking integration).
// note: "provider" is reserved for the protocol *within* yield.xyz (morpho, aave, …), so the
// yield.xyz-vs-seek distinction is a "system".
export type EarnSystemId = "yieldxyz" | "seek"

export type EarnProvider = {
  id: string
  name: string
  type: "protocol" | "custom"
  logoURI: string | null
}

export type EarnOpportunity = {
  id: string
  system: EarnSystemId
  providerId: string
  providerLogoURI: string | null
  tokenId: TokenId
  networkId: string
  title: string
  type: string
  apr: number | null
  searchTerms: string[]
}

export type TokenOpportunity = {
  tokenId: TokenId
  opportunities: EarnOpportunity[]
  bestApr: number
  balances: Balances
}
