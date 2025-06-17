import { isCustomChain, Network } from "@talismn/chaindata-provider"
import { activeChainsStore, isNetworkActive } from "extension-core"
import { useCallback, useMemo } from "react"

import { useActiveNetworksState, useNetworkById } from "@ui/state"

export const useKnownChain = (chainId: string | null | undefined) => {
  const chain = useNetworkById<"polkadot">(chainId ?? undefined)
  const activeChains = useActiveNetworksState()

  const isActive = useMemo(
    () => !!chain && isNetworkActive(chain as unknown as Network, activeChains),
    [activeChains, chain],
  )
  const isKnown = useMemo(() => !!chain && !isCustomChain(chain), [chain])

  const setActive = useCallback(
    (enable: boolean) => {
      if (!chainId || !chain) throw new Error(`Chain '${chainId}' not found`)
      activeChainsStore.setActive(chainId, enable)
    },
    [chain, chainId],
  )

  const isActiveSetByUser = useMemo(
    () => chainId !== null && chainId !== undefined && chainId in activeChains,
    [chainId, activeChains],
  )
  const resetToTalismanDefault = useCallback(() => {
    if (!chainId || !chain) throw new Error(`Chain '${chainId}' not found`)
    activeChainsStore.resetActive(chainId)
  }, [chain, chainId])

  return {
    chain,

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
