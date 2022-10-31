import { useSettings } from "@ui/hooks/useSettings"
import { useDbCache } from "./useDbCache"
import { useMemo } from "react"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useChains = () => {
  // keep db data up to date
  useDbCacheSubscription("chains")

  const { useTestnets = false } = useSettings()
  const { allChains } = useDbCache()

  return useMemo(
    () => allChains.filter(({ isTestnet }) => (useTestnets ? true : isTestnet === false)),
    [allChains, useTestnets]
  )
}

export default useChains
