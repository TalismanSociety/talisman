import { useMemo } from "react"

import { useRemoteConfig } from "../../../../state/remoteConfig"
import { useGetSeekStaked } from "./useGetSeekStaked"

export const useGetSeekDiscount = () => {
  const { data, isLoading, isError, refetch } = useGetSeekStaked()
  const remoteConfig = useRemoteConfig()

  // Convert remote config discount tiers from string to bigint
  const discountTiers = useMemo(() => {
    return remoteConfig.seek.discountTiers.map((tier) => ({
      ...tier,
      min: BigInt(tier.min),
    }))
  }, [remoteConfig.seek.discountTiers])

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
