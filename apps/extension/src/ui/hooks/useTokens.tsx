import { useSettings } from "@ui/hooks/useSettings"
import { useMemo } from "react"
import { useDbCache } from "./useDbData"
import { useDbDataSubscription } from "./useDbDataSubscription"

export const useTokens = () => {
  // keep db table up to date
  useDbDataSubscription("tokens")

  const { useTestnets = false } = useSettings()
  const { allTokens } = useDbCache()

  return useMemo(
    () => allTokens.filter(({ isTestnet }) => (useTestnets ? true : isTestnet === false)),
    [allTokens, useTestnets]
  )
}

export default useTokens
