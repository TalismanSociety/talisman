import { useBittensorValidators } from "@ui/state/bittensor"
import { keyBy } from "lodash-es"
import { useMemo } from "react"

import { useGetInfiniteValidatorsYieldByNetuid } from "./dTao/useGetInfiniteValidatorsYield"
import type { BondOption } from "./types"

export const useCombinedBittensorValidatorsData = (netuid?: number | null) => {
  const { data: validatorsYieldData, isLoading } = useGetInfiniteValidatorsYieldByNetuid({
    netuid: netuid || 0,
  })

  const { status, data: validators } = useBittensorValidators()

  const combinedValidatorsData = useMemo(() => {
    if (!validators) return []

    const validatorYieldMap = keyBy(validatorsYieldData ?? [], (yieldData) => yieldData.hotkey.ss58)

    const combined: BondOption[] =
      validators?.map((validator) => {
        const validatorYield = validatorYieldMap[validator.hotkey.ss58]

        return {
          hotkey: validator.hotkey?.ss58 ?? "",
          name: validator?.name ?? "",
          totalStaked: parseFloat(validator?.global_weighted_stake ?? "0"),
          totalStakers: validator?.global_nominators ?? 0,
          validatorYield,
          apr: parseFloat(validatorYield?.thirty_day_apy ?? "0"),
          subnets: validator.active_subnets,
          rank: validator.rank,
          hasData: !!validator,
          isError: status === "error",
        }
      }) ?? []

    return combined
  }, [status, validators, validatorsYieldData])

  return {
    combinedValidatorsData,
    isLoading: status === "loading" || isLoading,
    isInfiniteValidatorsError: status === "error",
    isError: status === "error",
  }
}
