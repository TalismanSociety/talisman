import {
  enabledEvmNetworksStore,
  isEvmNetworkEnabled,
} from "@core/domains/ethereum/store.enabledEvmNetworks"
import { isCustomEvmNetwork } from "@talismn/chaindata-provider"
import { useCallback, useMemo } from "react"

import { useEnabledEvmNetworksState } from "./useEnabledEvmNetworksState"
import { useEvmNetwork } from "./useEvmNetwork"

export const useKnownEvmNetwork = (evmNetworkId: string | null | undefined) => {
  const evmNetwork = useEvmNetwork(evmNetworkId ?? undefined)
  const enabledEvmNetworks = useEnabledEvmNetworksState()

  const isEnabled = useMemo(
    () => evmNetwork && isEvmNetworkEnabled(evmNetwork, enabledEvmNetworks),
    [enabledEvmNetworks, evmNetwork]
  )
  const isKnown = useMemo(() => evmNetwork && !isCustomEvmNetwork(evmNetwork), [evmNetwork])

  const setEnabled = useCallback(
    (enable: boolean) => {
      if (!evmNetworkId || !evmNetwork) throw new Error(`EvmNetwork '${evmNetworkId}' not found`)
      enabledEvmNetworksStore.setEnabled(evmNetworkId, enable)
    },
    [evmNetwork, evmNetworkId]
  )

  const isEnabledOrDisabledByUser = useMemo(
    () => evmNetworkId !== null && evmNetworkId !== undefined && evmNetworkId in enabledEvmNetworks,
    [evmNetworkId, enabledEvmNetworks]
  )
  const resetToTalismanDefault = useCallback(() => {
    if (!evmNetworkId || !evmNetwork) throw new Error(`EvmNetwork '${evmNetworkId}' not found`)
    enabledEvmNetworksStore.resetEnabled(evmNetworkId)
  }, [evmNetwork, evmNetworkId])

  return {
    evmNetwork,

    isEnabled,
    isKnown,

    setEnabled,

    /**
     * If true, enabled/disabled state comes from the user configuration.
     * If false, enabled/disabled state comes from chaindata default value.
     */
    isEnabledOrDisabledByUser,
    resetToTalismanDefault,
  }
}
