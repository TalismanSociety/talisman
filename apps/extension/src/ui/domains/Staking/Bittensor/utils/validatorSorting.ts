import type { BondOption } from "@ui/domains/Staking/hooks/bittensor/types"

export type ValidatorSortValue = "featured" | "name" | "totalStaked" | "totalStakers" | "apr"
type ValidatorSortOptions = {
  prioritizeFeatured?: boolean
}

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
  return validator.validatorYield?.thirty_day_apy ?? validator.apr
}

export const sortValidatorOptions = (
  data: BondOption[],
  sortBy: ValidatorSortValue,
  options: ValidatorSortOptions = {}
): BondOption[] => {
  const sorted = data.concat().sort((a, b) => {
    if (sortBy === "featured") {
      const featuredPriority = Number(b.isFeatured) - Number(a.isFeatured)
      if (featuredPriority !== 0) return featuredPriority

      const metricSort = compareNumberDescending(getFeaturedSortMetric(a), getFeaturedSortMetric(b))
      if (metricSort !== 0) return metricSort

      const yieldSort = compareYieldAvailability(a, b)
      if (yieldSort !== 0) return yieldSort

      return compareName(a, b)
    }

    const yieldSort = compareYieldAvailability(a, b)
    if (yieldSort !== 0) return yieldSort

    if (sortBy === "name") return compareName(a, b)

    const metricSort = compareNumberDescending(a[sortBy], b[sortBy])
    if (metricSort !== 0) return metricSort

    return compareName(a, b)
  })

  if (!options.prioritizeFeatured || sortBy === "featured") return sorted

  const featured = sorted.filter((validator) => validator.isFeatured)
  const others = sorted.filter((validator) => !validator.isFeatured)
  return featured.concat(others)
}
