import { useSettings } from "@ui/hooks/useSettings"
import { useDbCache } from "./useDbData"
import { useMemo } from "react"
import { useDbDataSubscription } from "./useDbDataSubscription"

export const useChains = () => {
  // keep db data up to date
  useDbDataSubscription("chains")

  const { useTestnets = false } = useSettings()
  const { allChains } = useDbCache()

  return useMemo(
    () => allChains.filter(({ isTestnet }) => (useTestnets ? true : isTestnet === false)),
    [allChains, useTestnets]
  )
}

export default useChains
