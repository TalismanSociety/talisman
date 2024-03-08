import { activeEvmNetworksStore, isEvmNetworkActive } from "@extension/core"
import { isCustomEvmNetwork } from "@talismn/chaindata-provider"
import { useCallback, useMemo } from "react"

import { useActiveEvmNetworksState } from "./useActiveEvmNetworksState"
import { useEvmNetwork } from "./useEvmNetwork"

export const useKnownEvmNetwork = (evmNetworkId: string | null | undefined) => {
  const evmNetwork = useEvmNetwork(evmNetworkId ?? undefined)
  const activeEvmNetworks = useActiveEvmNetworksState()

  const isActive = useMemo(
    () => !!evmNetwork && isEvmNetworkActive(evmNetwork, activeEvmNetworks),
    [activeEvmNetworks, evmNetwork]
  )
  const isKnown = useMemo(() => !!evmNetwork && !isCustomEvmNetwork(evmNetwork), [evmNetwork])

  const setActive = useCallback(
    (enable: boolean) => {
      if (!evmNetworkId || !evmNetwork) throw new Error(`EvmNetwork '${evmNetworkId}' not found`)
      activeEvmNetworksStore.setActive(evmNetworkId, enable)
    },
    [evmNetwork, evmNetworkId]
  )

  const isActiveSetByUser = useMemo(
    () => evmNetworkId !== null && evmNetworkId !== undefined && evmNetworkId in activeEvmNetworks,
    [evmNetworkId, activeEvmNetworks]
  )
  const resetToTalismanDefault = useCallback(() => {
    if (!evmNetworkId || !evmNetwork) throw new Error(`EvmNetwork '${evmNetworkId}' not found`)
    return activeEvmNetworksStore.resetActive(evmNetworkId)
  }, [evmNetwork, evmNetworkId])

  return {
    evmNetwork,

    isActive,
    isKnown,

    setActive,

    /**
     * If true, active state comes from the user configuration.
     * If false, active state comes from chaindata default value.
     */
    isActiveSetByUser,
    resetToTalismanDefault,
  }
}
