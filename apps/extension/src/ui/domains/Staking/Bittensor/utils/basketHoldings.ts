import type { bittensor } from "@polkadot-api/descriptors"

import { ROOT_NETUID } from "./constants"

/** decoded element of `get_validator_basket`: `[netuid, alpha, realizableTao]`, one fund holding valued at its realizable TAO */
export type BasketHoldingEntry =
  (typeof bittensor)["descriptors"]["apis"]["BetaBasketRuntimeApi"]["get_validator_basket"][1][number]

export type BasketHoldingSlice = { netuid: number; ratio: number }

export type BasketHoldingsBreakdown = {
  /** subnets with exposure — a netuid 0 (TAO cash slot) slice is excluded */
  subnetCount: number
  /** largest slices first, ratios over the fund's full realizable NAV including the TAO slot */
  topSlices: BasketHoldingSlice[]
  /** every positive slice, same order as topSlices */
  allSlices: BasketHoldingSlice[]
  othersRatio: number
}

const TOP_SLICE_COUNT = 8

/**
 * Fund composition by realizable value: the same slippage-aware mark NAV and claims use, so
 * each ratio is the share of a claim that subnet would pay. Holdings the AMM cannot price
 * (zero realizable value) carry no exposure and are dropped.
 */
export const getBasketHoldingsBreakdown = (
  holdings: BasketHoldingEntry[]
): BasketHoldingsBreakdown | null => {
  const positive = holdings.filter(([, , tao]) => tao > 0n)
  const total = positive.reduce((sum, [, , tao]) => sum + tao, 0n)
  if (!total) return null

  const allSlices = positive
    .toSorted(([netuidA, , taoA], [netuidB, , taoB]) =>
      taoB > taoA ? 1 : taoB < taoA ? -1 : netuidA - netuidB
    )
    .map(([netuid, , tao]) => ({ netuid, ratio: Number(tao) / Number(total) }))
  const topSlices = allSlices.slice(0, TOP_SLICE_COUNT)

  return {
    subnetCount: positive.filter(([netuid]) => netuid !== ROOT_NETUID).length,
    topSlices,
    allSlices,
    othersRatio: Math.max(0, 1 - topSlices.reduce((sum, slice) => sum + slice.ratio, 0)),
  }
}
