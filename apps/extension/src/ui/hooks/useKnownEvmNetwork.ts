import { isCustomEvmNetwork, isNetworkEth } from "@talismn/chaindata-provider"
import { activeNetworksStore, isNetworkActive } from "extension-core"
import { useCallback, useMemo } from "react"

import { useActiveNetworksState, useNetworkById } from "@ui/state"

// TODO combine with useKnownChain
export const useKnownEvmNetwork = (evmNetworkId: string | null | undefined) => {
  const evmNetwork = useNetworkById(evmNetworkId, "ethereum")
  const activeEvmNetworks = useActiveNetworksState()

  const isActive = useMemo(
    () => !!evmNetwork && isNetworkActive(evmNetwork, activeEvmNetworks),
    [activeEvmNetworks, evmNetwork],
  )
  const isKnown = useMemo(
    () => !!evmNetwork && isNetworkEth(evmNetwork) && !isCustomEvmNetwork(evmNetwork),
    [evmNetwork],
  )

  const setActive = useCallback(
    (enable: boolean) => {
      if (!evmNetworkId || !evmNetwork) throw new Error(`EvmNetwork '${evmNetworkId}' not found`)
      activeNetworksStore.setActive(evmNetworkId, enable)
    },
    [evmNetwork, evmNetworkId],
  )

  const isActiveSetByUser = useMemo(
    () => evmNetworkId !== null && evmNetworkId !== undefined && evmNetworkId in activeEvmNetworks,
    [evmNetworkId, activeEvmNetworks],
  )
  const resetToTalismanDefault = useCallback(() => {
    if (!evmNetworkId || !evmNetwork) throw new Error(`EvmNetwork '${evmNetworkId}' not found`)
    return activeNetworksStore.resetActive(evmNetworkId)
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
