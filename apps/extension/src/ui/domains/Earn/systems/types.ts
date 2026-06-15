import type { DefiPosition } from "@core/domains/defi/exports"
import type { TokenId } from "@talismn/chaindata-provider"
import type { FC, ReactNode } from "react"

import type { EarnOpportunity, EarnPosition, EarnProvider, EarnSystemId } from "../types"

// normalized loading state every system reports, regardless of whether it sources data from
// react-query, react-rxjs, etc. A best-effort system bakes its own semantics into this (e.g. SEEK
// reports "success" rather than "error" so a read failure never breaks the whole Earn view).
export type EarnSystemStatus = "loading" | "success" | "error"

// context the deposit picker passes to a system when opening its action flow (info that lives on the
// picker, not the opportunity, e.g. which token the user came from)
export type EarnActionContext = {
  tokenId?: string
  discoverOnly?: boolean
}

export type EarnActionOpener = (opportunity: EarnOpportunity, context: EarnActionContext) => void

export type EarnSystemOpportunitiesResult = {
  status: EarnSystemStatus
  // opportunities grouped by the input token they apply to
  byTokenId: Record<TokenId, EarnOpportunity[]>
}

export type EarnSystemProvidersResult = {
  status: EarnSystemStatus
  providers: EarnProvider[]
}

export type EarnSystemPositionsResult = {
  status: EarnSystemStatus
  positions: EarnPosition[]
  // optional narrowing predicate: a DeFi position that overlaps this system by address/network/token
  // is only treated as a duplicate (and hidden) when this also returns true. Omit to dedupe on
  // overlap alone (the yield.xyz behaviour).
  isDuplicateDefiPosition?: (defiPosition: DefiPosition) => boolean
}

// One Earn "system" = one actionable staking integration (yield.xyz aggregator, SEEK, …) plugged
// into the discover + positions pages. Add a system by implementing this and registering it in
// systems/registry.ts — the aggregation/dispatch sites loop the registry, so no other file needs a
// per-system branch. (Detail-page routes remain per-system because they live in the app shells.)
export type EarnSystem = {
  id: EarnSystemId
  /** Discover: opportunities this system offers, grouped by input token. */
  useOpportunities: () => EarnSystemOpportunitiesResult
  /** Discover: providers/protocols this system contributes (for the provider filter). */
  useProviders: () => EarnSystemProvidersResult
  /** Positions: this system's held positions, mapped to the shared EarnPosition shape. */
  usePositions: () => EarnSystemPositionsResult
  /** Returns a stable callback that opens this system's deposit/action flow for an opportunity. */
  useActionOpener: () => EarnActionOpener
  /** Global action-modal singleton, auto-mounted once per app shell. Omit if mounted elsewhere. */
  ActionModal?: FC
  /** Optional custom picker-row slots; omitted slots fall back to a generic logo + APR. */
  renderOpportunityLogo?: (opportunity: EarnOpportunity) => ReactNode
  renderOpportunityMetric?: (opportunity: EarnOpportunity) => ReactNode
  renderOpportunityYield?: (opportunity: EarnOpportunity) => ReactNode
}
