import { useMemo } from "react"

import { useFeatureFlag, useRemoteConfig } from "../../../../state/remoteConfig"
import { getSeekDiscountTier } from "../utils/seekDiscount"
import { useGetSeekStaked } from "./useGetSeekStaked"

export const useGetSeekDiscount = () => {
  const { data, isLoading, isError, refetch } = useGetSeekStaked()
  const remoteConfig = useRemoteConfig()
  const isSeekTaoDiscountEnabled = useFeatureFlag("SEEK_TAO_DISCOUNT")
  const totalStaked = isLoading || isError || !data ? null : data.totalStaked.planck

  const tier = useMemo(
    () =>
      getSeekDiscountTier(totalStaked, remoteConfig.seek.discountTiers, isSeekTaoDiscountEnabled),
    [totalStaked, remoteConfig.seek.discountTiers, isSeekTaoDiscountEnabled]
  )

  return { tier, isLoading, isError, refetch }
}
