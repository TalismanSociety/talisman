import type { BondOption } from "@ui/domains/Staking/hooks/bittensor/types"

export type ValidatorSortValue = "featured" | "name" | "totalStaked" | "totalStakers" | "apr"

const compareNumberDescending = (a: number, b: number) => {
  if (a > b) return -1
  if (a < b) return 1
  return 0
}

const compareName = (a: BondOption, b: BondOption) => {
  if (a.name && !b.name) return -1
  if (!a.name && b.name) return 1
  return (a.name || a.hotkey).localeCompare(b.name || b.hotkey)
}

const compareYieldAvailability = (a: BondOption, b: BondOption) =>
  Number(Boolean(b.validatorYield)) - Number(Boolean(a.validatorYield))

const getFeaturedSortMetric = (validator: BondOption) => {
  return validator.totalStaked
}

export const sortValidatorOptions = (
  data: BondOption[],
  sortBy: ValidatorSortValue
): BondOption[] => {
  return data.concat().sort((a, b) => {
    if (sortBy === "featured") {
      // featured validators pinned to top in config order
      if (a.isFeatured && b.isFeatured) return a.featuredOrder - b.featuredOrder
      if (a.isFeatured) return -1
      if (b.isFeatured) return 1

      // non-featured: inactive validators (no yield/APR) sink to bottom
      const yieldSort = compareYieldAvailability(a, b)
      if (yieldSort !== 0) return yieldSort

      // then sorted by composite metric
      const metricSort = compareNumberDescending(getFeaturedSortMetric(a), getFeaturedSortMetric(b))
      if (metricSort !== 0) return metricSort

      return compareName(a, b)
    }

    const yieldSort = compareYieldAvailability(a, b)
    if (yieldSort !== 0) return yieldSort

    if (sortBy === "name") return compareName(a, b)

    const metricSort = compareNumberDescending(a[sortBy], b[sortBy])
    if (metricSort !== 0) return metricSort

    return compareName(a, b)
  })
}
