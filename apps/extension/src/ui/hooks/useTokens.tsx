import { useSettings } from "@ui/hooks/useSettings"
import { useMemo } from "react"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useTokens = () => {
  // keep db table up to date
  useDbCacheSubscription("tokens")

  const { useTestnets = false } = useSettings()
  const { allTokens } = useDbCache()

  return useMemo(
    () => allTokens.filter(({ isTestnet }) => (useTestnets ? true : isTestnet === false)),
    [allTokens, useTestnets]
  )
}

export default useTokens
