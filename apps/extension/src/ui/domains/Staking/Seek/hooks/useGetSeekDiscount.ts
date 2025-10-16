import { useMemo } from "react"

import { useFeatureFlag, useRemoteConfig } from "../../../../state/remoteConfig"
import { useGetSeekStaked } from "./useGetSeekStaked"

const DEFAULT_TIER = { tier: 0, min: 0n, discount: 0 }

export const useGetSeekDiscount = () => {
  const { data, isLoading, isError, refetch } = useGetSeekStaked()
  const remoteConfig = useRemoteConfig()
  const isSeekTaoDiscountEnabled = useFeatureFlag("SEEK_TAO_DISCOUNT")

  // Convert remote config discount tiers from string to bigint
  const discountTiers = useMemo(() => {
    return remoteConfig.seek.discountTiers.map((tier) => ({
      ...tier,
      min: BigInt(tier.min),
    }))
  }, [remoteConfig.seek.discountTiers])

  if (!isSeekTaoDiscountEnabled) {
    return { tier: DEFAULT_TIER, isLoading, isError, refetch }
  }

  const defaultTier = discountTiers[0] || { tier: 0, min: 0n, discount: 0 }

  if (isLoading || isError || !data) {
    return { tier: defaultTier, isLoading, isError, refetch }
  }

  const getTier = ({ amount }: { amount: bigint }) => {
    return discountTiers.findLast((tier) => amount >= tier.min) || defaultTier
  }

  const tier = getTier({ amount: data.totalStaked.planck })

  return { tier, isLoading, isError, refetch }
}
