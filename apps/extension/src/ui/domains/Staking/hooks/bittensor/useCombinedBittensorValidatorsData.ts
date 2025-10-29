import { useMemo } from "react"

import { useGetInfiniteValidatorsYieldByNetuid } from "./dTao/useGetInfiniteValidatorsYield"
import { BondOption } from "./types"
import { useGetBittensorValidators } from "./useGetBittensorInfiniteValidators"

export const useCombinedBittensorValidatorsData = (netuid?: number | null) => {
  const { data: validatorsYieldData } = useGetInfiniteValidatorsYieldByNetuid({
    netuid: netuid || 0,
  })

  const {
    data: infiniteValidators,
    isLoading: isValidatorsLoading,
    isError: isInfiniteValidatorsError,
  } = useGetBittensorValidators()

  const combinedValidatorsData = useMemo(() => {
    if (isValidatorsLoading || !infiniteValidators) return []

    const combined: BondOption[] =
      infiniteValidators?.map((validator) => {
        const validatorYield = validatorsYieldData?.find(
          (yieldData) => yieldData?.hotkey?.ss58 === validator.hotkey?.ss58,
        )

        return {
          hotkey: validator.hotkey?.ss58 ?? "",
          name: validator?.name ?? "",
          totalStaked: parseFloat(validator?.global_weighted_stake ?? "0"),
          totalStakers: validator?.global_nominators ?? 0,
          validatorYield,
          apr: parseFloat(validatorYield?.thirty_day_apy ?? "0"),
          hasData: !!validator,
          isError: isInfiniteValidatorsError,
        }
      }) ?? []

    return combined
  }, [infiniteValidators, isInfiniteValidatorsError, isValidatorsLoading, validatorsYieldData])

  return {
    combinedValidatorsData,
    isLoading: isValidatorsLoading,
    isInfiniteValidatorsError,
    isError: isInfiniteValidatorsError,
  }
}
