import { useSettings } from "@ui/hooks/useSettings"
import { useMemo } from "react"
import { useDbCache } from "./useDbData"
import { useDbDataSubscription } from "./useDbDataSubscription"

export const useEvmNetworks = () => {
  // keep db up to date
  useDbDataSubscription("evmNetworks")

  const { useTestnets = false } = useSettings()
  const { allEvmNetworks } = useDbCache()

  return useMemo(
    () => allEvmNetworks.filter(({ isTestnet }) => (useTestnets ? true : isTestnet === false)),
    [allEvmNetworks, useTestnets]
  )
}
