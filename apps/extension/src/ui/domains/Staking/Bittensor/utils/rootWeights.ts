import { ROOT_NETUID } from "./constants"

/** decoded element of `get_validator_weights`: declared root weight for one destination */
export type RootWeightEntry = [netuid: number, weight: number]

export type RootWeightSlice = { netuid: number; ratio: number }

export type RootWeightsBreakdown = {
  /** subnets with exposure — a netuid 0 (TAO cash position) slice is excluded */
  subnetCount: number
  /** largest slices first, ratios over the full vector including the TAO slice */
  topSlices: RootWeightSlice[]
  /** every positive slice, same order as topSlices */
  allSlices: RootWeightSlice[]
  othersRatio: number
}

const TOP_SLICE_COUNT = 8

/**
 * Weights are max-upscaled on chain (largest entry = u16::MAX), not sum-normalized:
 * proportions only exist relative to the vector's own sum, mirroring how the chain
 * deploys deposits (`deploy_tao_into_basket`).
 */
export const getRootWeightsBreakdown = (
  weights: RootWeightEntry[]
): RootWeightsBreakdown | null => {
  const positive = weights.filter(([, weight]) => weight > 0)
  const total = positive.reduce((sum, [, weight]) => sum + weight, 0)
  if (!total) return null

  const allSlices = positive
    .toSorted(([netuidA, weightA], [netuidB, weightB]) => weightB - weightA || netuidA - netuidB)
    .map(([netuid, weight]) => ({ netuid, ratio: weight / total }))
  const topSlices = allSlices.slice(0, TOP_SLICE_COUNT)

  return {
    subnetCount: positive.filter(([netuid]) => netuid !== ROOT_NETUID).length,
    topSlices,
    allSlices,
    othersRatio: Math.max(0, 1 - topSlices.reduce((sum, slice) => sum + slice.ratio, 0)),
  }
}
