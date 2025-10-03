import { useQuery } from "@tanstack/react-query"

import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useRemoteConfig } from "@ui/state"

import { abiSeekStaking } from "./abiSeekStaking"

export const useSeekStakingApr = () => {
  const remoteConfig = useRemoteConfig()
  const publicClient = usePublicClient(remoteConfig.seek.stakingContractNetworkId)

  return useQuery({
    queryKey: ["useSeekStakingApr", publicClient?.uid, remoteConfig.seek.stakingContractAddress],
    queryFn: async () => {
      if (!publicClient) return null

      const [totalStaked, rewardsPerSecond] = await Promise.all([
        publicClient.readContract({
          abi: abiSeekStaking,
          address: remoteConfig.seek.stakingContractAddress,
          functionName: "totalStaked",
        }),
        publicClient.readContract({
          abi: abiSeekStaking,
          address: remoteConfig.seek.stakingContractAddress,
          functionName: "rewardRate",
        }),
      ])

      const SECONDS_IN_YEAR = BigInt(365.25 * 24 * 60 * 60) // 31,536,000 seconds
      const MULTIPLIER = 10_000n // use to preserve decimal precision when working with bigints
      const multipliedApr = (rewardsPerSecond * SECONDS_IN_YEAR * MULTIPLIER) / totalStaked
      const apr = Number(multipliedApr) / Number(MULTIPLIER)

      return apr
    },
    refetchInterval: 5 * 60 * 1000, // refetch every 5 minutes
  })
}
