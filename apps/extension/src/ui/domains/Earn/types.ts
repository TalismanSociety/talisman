import type { Balances } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"

export type EarnProviderId = "yieldxyz" | "seek"

export type EarnProvider = {
  id: EarnProviderId | string
  name: string
  type: "protocol" | "custom"
  logoURI: string | null
}

export type EarnOpportunity = {
  id: string
  providerId: EarnProviderId | string
  providerName: string
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
