import { useMemo } from "react"

import { ChainId } from "@extension/core"
import { useRemoteConfig } from "@ui/state"

export const useDetaultNomPoolId = (chainId?: ChainId | null | undefined) => {
  const remoteConfig = useRemoteConfig()

  return useMemo(() => {
    if (!chainId || chainId === "bittensor") return null
    return remoteConfig.stakingPools?.[chainId]?.[0] ?? null
  }, [chainId, remoteConfig.stakingPools])
}
