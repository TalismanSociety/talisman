import { useEffect, useMemo } from "react"

import { useGetInfiniteValidatorsYieldByNetuid } from "./dTao/useGetInfiniteValidatorsYield"
import { BondOption } from "./types"
import { useGetBittensorInfiniteValidators } from "./useGetBittensorInfiniteValidators"
import { useGetBittensorSupportedDelegates } from "./useGetBittensorSupportedDelegates"

export const useCombinedBittensorValidatorsData = (netuid?: number | null) => {
  const { data: validatorsYieldData } = useGetInfiniteValidatorsYieldByNetuid({
    netuid: netuid || 0,
  })
  const {
    data: supportedDelegates,
    isLoading: isSupportedDelegatesLoading,
    isError: isBittensorSupportedDelegatesError,
  } = useGetBittensorSupportedDelegates()
  const {
    data: infiniteValidators,
    isLoading: isValidatorsLoading,
    isError: isInfiniteValidatorsError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGetBittensorInfiniteValidators({ isEnabled: true })

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const combinedValidatorsData = useMemo(() => {
    if (
      isSupportedDelegatesLoading ||
      isFetchingNextPage ||
      isValidatorsLoading ||
      !supportedDelegates ||
      !infiniteValidators
    )
      return []

    const flatInitialValidators = infiniteValidators.pages.flatMap((page) => page.data)

    const combined: BondOption[] = Object.keys(supportedDelegates).map((key) => {
      const supportedDelegate = supportedDelegates[key]
      const validator = flatInitialValidators.find((validator) => validator?.hotkey?.ss58 === key)
      const validatorYield = validatorsYieldData?.find(
        (validator) => validator?.hotkey?.ss58 === key,
      )

      return {
        poolId: key,
        name: supportedDelegate.name,
        totalStaked: parseFloat(validator?.global_weighted_stake ?? "0"),
        totalStakers: validator?.global_nominators ?? 0,
        validatorYield: validatorYield,
        apr: parseFloat(validatorYield?.thirty_day_apy ?? "0"),
        hasData: !!validator,
        isError: isInfiniteValidatorsError,
      }
    })

    return combined
  }, [
    infiniteValidators,
    isFetchingNextPage,
    isInfiniteValidatorsError,
    isSupportedDelegatesLoading,
    isValidatorsLoading,
    supportedDelegates,
    validatorsYieldData,
  ])

  return {
    combinedValidatorsData,
    isLoading: isSupportedDelegatesLoading || isValidatorsLoading || isFetchingNextPage,
    isSupportedValidatorsError: isBittensorSupportedDelegatesError,
    isInfiniteValidatorsError,
    isError: isInfiniteValidatorsError || isBittensorSupportedDelegatesError,
  }
}
