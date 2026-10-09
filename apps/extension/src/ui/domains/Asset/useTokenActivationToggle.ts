import { networkToggledOf, tokenToggledOf } from "@common/analytics/networks"
import { log } from "@common/log"
import {
  type ActiveNetworks,
  activeNetworksStore,
  isNetworkActive,
} from "@core/domains/chaindata/store.activeNetworks"
import {
  type ActiveTokens,
  activeTokensStore,
  getActiveTokenFlagId,
  isTokenActive,
} from "@core/domains/chaindata/store.activeTokens"
import type { Network, Token } from "@talismn/chaindata-provider"
import { reportError } from "@ui/api/errorReporting"
import { track } from "@ui/api/track"
import { useActiveNetworksState, useActiveTokensState, useNetworkById } from "@ui/state/chaindata"
import { useCallback, useEffect, useState } from "react"

const HOLD_MS = 1000
const MAX_HOLD_MS = 5000

type InactiveFlag = {
  store: typeof activeNetworksStore | typeof activeTokensStore
  id: string
  override: boolean | undefined
  onToggled: (enabled: boolean) => void
}

type Hold = { checked: boolean; flags: InactiveFlag[]; clickedAt: number }

const getInactiveFlags = (
  token: Token,
  network: Network,
  activeNetworks: ActiveNetworks,
  activeTokens: ActiveTokens
) => {
  const flags: InactiveFlag[] = []
  if (!isNetworkActive(network, activeNetworks))
    flags.push({
      store: activeNetworksStore,
      id: network.id,
      override: activeNetworks[network.id],
      onToggled: (enabled) =>
        track("network_toggled", networkToggledOf(network, enabled, "token_picker")),
    })
  if (!isTokenActive(token, activeTokens)) {
    const id = getActiveTokenFlagId(token)
    flags.push({
      store: activeTokensStore,
      id,
      override: activeTokens[id],
      onToggled: (enabled) =>
        track("token_toggled", tokenToggledOf(token, network, enabled, "token_picker")),
    })
  }
  return flags
}

const writeFlag = async (flag: InactiveFlag, checked: boolean) => {
  if (checked) await flag.store.setActive(flag.id, true)
  else if (flag.override === undefined) await flag.store.resetActive(flag.id)
  else await flag.store.setActive(flag.id, flag.override)
  flag.onToggled(checked)
}

export const useTokenActivationToggle = (token: Token) => {
  const network = useNetworkById(token.networkId)
  const activeNetworks = useActiveNetworksState()
  const activeTokens = useActiveTokensState()
  const isActive =
    !!network && isNetworkActive(network, activeNetworks) && isTokenActive(token, activeTokens)

  const [held, setHeld] = useState<Hold | null>(null)

  useEffect(() => {
    if (!held) return
    const delay = isActive === held.checked ? HOLD_MS : held.clickedAt + MAX_HOLD_MS - Date.now()
    const timeout = setTimeout(() => setHeld(null), delay)
    return () => clearTimeout(timeout)
  }, [held, isActive])

  const onChange = useCallback(
    (checked: boolean) => {
      if (!network) return
      const flags = held?.flags ?? getInactiveFlags(token, network, activeNetworks, activeTokens)
      setHeld({ checked, flags, clickedAt: Date.now() })
      Promise.all(flags.map((flag) => writeFlag(flag, checked))).catch((err) => {
        log.error("Failed to toggle token activation", { err })
        reportError(err)
        setHeld(null)
      })
    },
    [activeNetworks, activeTokens, held, network, token]
  )

  return { showToggle: !isActive || held !== null, checked: held?.checked ?? isActive, onChange }
}
