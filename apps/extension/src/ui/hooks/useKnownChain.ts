import { enabledChainsStore, isChainEnabled } from "@core/domains/chains/store.enabledChains"
import { isCustomChain } from "@talismn/chaindata-provider"
import { useCallback, useMemo } from "react"

import useChain from "./useChain"
import { useEnabledChainsState } from "./useEnabledChainsState"

export const useKnownChain = (chainId: string | null | undefined) => {
  const chain = useChain(chainId ?? undefined)
  const enabledChains = useEnabledChainsState()

  const isEnabled = useMemo(
    () => chain && isChainEnabled(chain, enabledChains),
    [enabledChains, chain]
  )
  const isKnown = useMemo(() => chain && !isCustomChain(chain), [chain])

  const setEnabled = useCallback(
    (enable: boolean) => {
      if (!chainId || !chain) throw new Error("Chain not found")
      enabledChainsStore.setEnabled(chainId, enable)
    },
    [chain, chainId]
  )

  const isEnabledOrDisabledByUser = useMemo(
    () => chainId !== null && chainId !== undefined && chainId in enabledChains,
    [chainId, enabledChains]
  )
  const resetToTalismanDefault = useCallback(() => {
    if (!chainId || !chain) throw new Error("Chain not found")
    enabledChainsStore.resetEnabled(chainId)
  }, [chain, chainId])

  return {
    chain,

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
