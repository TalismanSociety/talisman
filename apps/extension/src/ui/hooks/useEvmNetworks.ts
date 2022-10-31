import { useSettings } from "@ui/hooks/useSettings"
import { useMemo } from "react"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useEvmNetworks = () => {
  // keep db up to date
  useDbCacheSubscription("evmNetworks")

  const { useTestnets = false } = useSettings()
  const { allEvmNetworks } = useDbCache()

  return useMemo(
    () => allEvmNetworks.filter(({ isTestnet }) => (useTestnets ? true : isTestnet === false)),
    [allEvmNetworks, useTestnets]
  )
}
