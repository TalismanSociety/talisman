import { Network } from "@talismn/chaindata-provider"
import { activeNetworksStore, isNetworkActive } from "extension-core"
import { useCallback, useMemo } from "react"

import { useActiveNetworksState } from "@ui/state"

export const useActivableNetwork = (network: Network | undefined) => {
  const activeNetworks = useActiveNetworksState()

  const isActive = useMemo(
    () => network && isNetworkActive(network, activeNetworks),
    [activeNetworks, network],
  )

  const setActive = useCallback(
    async (active: boolean) => {
      if (!network) throw new Error("Network not found")
      await activeNetworksStore.setActive(network.id, active)
    },
    [network],
  )

  const toggleActive = useCallback(async () => {
    if (!network) throw new Error("Network not found")
    await setActive(!isActive)
  }, [isActive, setActive, network])

  const isActiveSetByUser = useMemo(
    () => network && network.id in activeNetworks,
    [network, activeNetworks],
  )

  const resetToTalismanDefault = useCallback(() => {
    if (!network) throw new Error("Network not found")
    activeNetworksStore.resetActive(network.id)
  }, [network])

  return {
    network,
    isActive,
    setActive,
    toggleActive,

    /**
     * If true, active state comes from the user configuration.
     * If false, active state comes from chaindata default value.
     */
    isActiveSetByUser,
    resetToTalismanDefault,
  }
}
