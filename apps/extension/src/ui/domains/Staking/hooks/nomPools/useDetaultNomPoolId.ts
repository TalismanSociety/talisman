import { ChainId } from "extension-core"
import { useMemo } from "react"

import { useRemoteConfig } from "@ui/state"

export const useDetaultNomPoolId = (chainId?: ChainId | null | undefined) => {
  const remoteConfig = useRemoteConfig()

  return useMemo(() => {
    if (!chainId) return null
    return remoteConfig.nominationPools?.[chainId]?.[0] ?? null
  }, [chainId, remoteConfig.nominationPools])
}
