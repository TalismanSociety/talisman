import { useMemo } from "react"

import { ChainId } from "@extension/core"
import { useRemoteConfig } from "@ui/state"

export const useRecommendedPoolsIds = (chainId?: ChainId | null | undefined) => {
  const remoteConfig = useRemoteConfig()

  return useMemo(() => {
    if (!chainId) return null
    return remoteConfig.stakingPools?.[chainId] ?? null
  }, [chainId, remoteConfig.stakingPools])
}
