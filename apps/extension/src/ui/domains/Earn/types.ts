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

export type EarnPositionDisplayToken = {
  tokenId: TokenId | null
  symbol: string
  logoUrl: string | null
}

// a held position, flattened to a system-agnostic shape so the positions list and navigation
// (`detailUrl`) never branch on which system produced it
export type EarnPosition = {
  id: string
  address: string
  networkId: string | null
  logoUrl: string | null
  providerName: string
  title: string
  type: string | null
  isReadOnly: boolean
  displayTokens: EarnPositionDisplayToken[]
  totalAmountUsd: number
  apr: number | null // percentage value, e.g. 4.5 == 4.5%; null when unknown
  rateType: string | null // "APR" | "APY"; null when apr is null
  detailUrl: string
  tokenIds: TokenId[]
  searchTerms: string[]
}
