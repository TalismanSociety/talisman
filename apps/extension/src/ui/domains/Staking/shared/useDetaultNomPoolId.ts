import { useAtomValue } from "jotai"
import { useMemo } from "react"

import { ChainId } from "@extension/core"
import { remoteConfigAtom } from "@ui/atoms/remoteConfig"

export const useDetaultNomPoolId = (chainId?: ChainId | null | undefined) => {
  const remoteConfig = useAtomValue(remoteConfigAtom)

  return useMemo(() => {
    if (!chainId) return null
    return remoteConfig.nominationPools?.[chainId]?.[0] ?? null
  }, [chainId, remoteConfig.nominationPools])
}
