import { DotNetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useRemoteConfig } from "@ui/state"

export const useDetaultNomPoolId = (chainId?: DotNetworkId | null | undefined) => {
  const remoteConfig = useRemoteConfig()

  return useMemo(() => {
    if (!chainId) return null
    return remoteConfig.nominationPools?.[chainId]?.[0] ?? null
  }, [chainId, remoteConfig.nominationPools])
}
