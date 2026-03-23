import { useBittensorValidators } from "@ui/state/bittensor"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { keyBy } from "lodash-es"
import { useMemo } from "react"

import { useGetValidatorsYield } from "./dTao/useGetValidatorsYield"
import type { BondOption } from "./types"

export const useCombinedBittensorValidatorsData = (netuid?: number | null) => {
  const { data: validatorsYieldData, isLoading } = useGetValidatorsYield({
    netuid: netuid || 0,
  })

  const { status, data: validators } = useBittensorValidators()
  const {
    bittensor: { featuredValidators },
  } = useRemoteConfig()

  const featuredHotkeyOrder = useMemo(
    () => new Map(featuredValidators.map((hotkey, i) => [hotkey.toLowerCase(), i])),
    [featuredValidators]
  )

  const combinedValidatorsData = useMemo(() => {
    if (!validators || isLoading) return []

    const validatorYieldMap = keyBy(validatorsYieldData ?? [], (yieldData) => yieldData.hotkey)

    const combined: BondOption[] =
      validators?.map((validator) => {
        const validatorYield = validatorYieldMap[validator.hotkey]

        return {
          hotkey: validator.hotkey,
          name: validator?.name ?? "",
          totalStaked: parseFloat(validator?.global_weighted_stake ?? "0"),
          totalStakers: validator?.global_nominators ?? 0,
          validatorYield,
          apr: Number(validatorYield?.thirty_day_apy ?? 0),
          subnets: validator.active_subnets,
          rank: validator.rank,
          isFeatured: featuredHotkeyOrder.has(validator.hotkey.toLowerCase()) && !!validatorYield,
          featuredOrder: featuredHotkeyOrder.get(validator.hotkey.toLowerCase()) ?? -1,
          hasData: !!validator,
          isError: status === "error",
        }
      }) ?? []

    return combined
  }, [featuredHotkeyOrder, isLoading, status, validators, validatorsYieldData])

  return {
    combinedValidatorsData,
    isLoading: status === "loading" || isLoading,
    isInfiniteValidatorsError: status === "error",
    isError: status === "error",
  }
}
