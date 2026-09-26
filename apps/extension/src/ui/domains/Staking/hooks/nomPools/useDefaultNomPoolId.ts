import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { useMemo } from "react"

export const useDefaultNomPoolId = (chainId?: DotNetworkId | null | undefined) => {
  const remoteConfig = useRemoteConfig()

  return useMemo(() => {
    if (!chainId) return null
    return remoteConfig.nominationPools?.[chainId]?.[0] ?? null
  }, [chainId, remoteConfig.nominationPools])
}
