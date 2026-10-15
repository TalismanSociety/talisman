import { networkToggledOf } from "@common/analytics/networks"
import { activeNetworksStore, isNetworkActive } from "@core/domains/chaindata/store.activeNetworks"
import type { Network } from "@talismn/chaindata-provider"
import { track } from "@ui/api/track"
import { useActiveNetworksState } from "@ui/state/chaindata"
import { useCallback, useMemo } from "react"

export const useActivableNetwork = (network: Network | undefined) => {
  const activeNetworks = useActiveNetworksState()

  const isActive = useMemo(
    () => network && isNetworkActive(network, activeNetworks),
    [activeNetworks, network]
  )

  const setActive = useCallback(
    async (active: boolean) => {
      if (!network) throw new Error("Network not found")
      await activeNetworksStore.setActive(network.id, active)
      if (active !== isActive)
        track("network_toggled", networkToggledOf(network, active, "settings"))
    },
    [network, isActive]
  )

  const toggleActive = useCallback(async () => {
    if (!network) throw new Error("Network not found")
    await setActive(!isActive)
  }, [isActive, setActive, network])

  const isActiveSetByUser = useMemo(
    () => network && network.id in activeNetworks,
    [network, activeNetworks]
  )

  const resetToTalismanDefault = useCallback(() => {
    if (!network) throw new Error("Network not found")
    activeNetworksStore.resetActive(network.id)
    const active = isNetworkActive(network, {})
    if (active !== isActive) track("network_toggled", networkToggledOf(network, active, "settings"))
  }, [network, isActive])

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
