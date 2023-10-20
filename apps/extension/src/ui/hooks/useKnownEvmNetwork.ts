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
      if (!evmNetworkId || !evmNetwork) throw new Error("EvmNetwork not found")
      enabledEvmNetworksStore.setEnabled(evmNetworkId ?? undefined, enable)
    },
    [evmNetwork, evmNetworkId]
  )

  return { evmNetwork, isEnabled, isKnown, setEnabled }
}
