import { networkToggledOf, tokenToggledOf } from "@common/analytics/networks"
import { activeNetworksStore, isNetworkActive } from "@core/domains/chaindata/store.activeNetworks"
import {
  activeTokensStore,
  getActiveTokenFlagId,
  isTokenActive,
} from "@core/domains/chaindata/store.activeTokens"
import type { Network, Token } from "@talismn/chaindata-provider"
import { track } from "@ui/api/track"
import { useActiveNetworksState, useActiveTokensState, useNetworkById } from "@ui/state/chaindata"
import { useCallback, useEffect, useState } from "react"

const HOLD_MS = 1000

type StoredFlag = { previous: boolean | undefined }

type Activation = { network: StoredFlag | null; token: StoredFlag | null }

const NO_ACTIVATION: Activation = { network: null, token: null }

type Hold = { checked: boolean; activation: Activation }

const setStoredFlag = (
  store: typeof activeNetworksStore | typeof activeTokensStore,
  id: string,
  value: boolean | undefined
) => (value === undefined ? store.resetActive(id) : store.setActive(id, value))

const setActivation = (token: Token, network: Network, activation: Activation, active: boolean) => {
  if (activation.network) {
    setStoredFlag(activeNetworksStore, network.id, active ? true : activation.network.previous)
    track("network_toggled", networkToggledOf(network, active, "token_picker"))
  }
  if (activation.token) {
    setStoredFlag(
      activeTokensStore,
      getActiveTokenFlagId(token),
      active ? true : activation.token.previous
    )
    track("token_toggled", tokenToggledOf(token, network, active, "token_picker"))
  }
}

export const useTokenActivationToggle = (token: Token, isActive: boolean) => {
  const network = useNetworkById(token.networkId)
  const activeNetworks = useActiveNetworksState()
  const activeTokens = useActiveTokensState()

  const [held, setHeld] = useState<Hold | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: isActive restarts the hold window once the stores catch up, so it counts from when the change is on screen
  useEffect(() => {
    if (!held) return
    const timeout = setTimeout(() => setHeld(null), HOLD_MS)
    return () => clearTimeout(timeout)
  }, [held, isActive])

  const onChange = useCallback(
    (checked: boolean) => {
      if (!network) return

      if (checked) {
        const activation = {
          network: isNetworkActive(network, activeNetworks)
            ? null
            : { previous: activeNetworks[network.id] },
          token: isTokenActive(token, activeTokens)
            ? null
            : { previous: activeTokens[getActiveTokenFlagId(token)] },
        }
        setActivation(token, network, activation, true)
        setHeld({ checked: true, activation })
      } else {
        setActivation(token, network, held?.activation ?? NO_ACTIVATION, false)
        setHeld({ checked: false, activation: NO_ACTIVATION })
      }
    },
    [activeNetworks, activeTokens, held, network, token]
  )

  return { showToggle: !isActive || held !== null, checked: held?.checked ?? isActive, onChange }
}
