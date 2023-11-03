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
      enabledChainsStore.setEnabled(chainId ?? undefined, enable)
    },
    [chain, chainId]
  )

  return { chain, isEnabled, isKnown, setEnabled }
}
