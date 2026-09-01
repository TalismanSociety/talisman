import { ROOT_NETUID } from "./constants"

/** decoded element of `get_validator_weights`: declared root weight for one destination */
export type RootWeightEntry = [netuid: number, weight: number]

export type RootWeightsBreakdown = {
  /** subnets with exposure — a netuid 0 (TAO cash position) slice is excluded */
  subnetCount: number
  /** largest slices first, ratios over the full vector including the TAO slice */
  topSlices: { netuid: number; ratio: number }[]
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

  const topSlices = positive
    .toSorted(([, a], [, b]) => b - a)
    .slice(0, TOP_SLICE_COUNT)
    .map(([netuid, weight]) => ({ netuid, ratio: weight / total }))

  return {
    subnetCount: positive.filter(([netuid]) => netuid !== ROOT_NETUID).length,
    topSlices,
    othersRatio: Math.max(0, 1 - topSlices.reduce((sum, slice) => sum + slice.ratio, 0)),
  }
}
