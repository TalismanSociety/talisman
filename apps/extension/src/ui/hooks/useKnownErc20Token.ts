import { activeTokensStore, isTokenActive } from "@extension/core"
import { isErc20Token } from "@ui/util/isErc20Token"
import { useCallback, useMemo } from "react"

import { useActiveTokensState } from "./useActiveTokensState"
import useTokens from "./useTokens"

export const useKnownErc20Token = (
  evmNetworkId: string | undefined | null,
  contractAddress: string | undefined | null
) => {
  const { tokens: allTokens } = useTokens({ activeOnly: false, includeTestnets: true })
  const allErc20Tokens = useMemo(() => allTokens.filter(isErc20Token), [allTokens])

  const activeTokens = useActiveTokensState()

  const token = useMemo(() => {
    const lowerContractAddress = contractAddress?.toLowerCase()
    return allErc20Tokens.find(
      (t) =>
        t.evmNetwork?.id === evmNetworkId &&
        t.contractAddress.toLowerCase() === lowerContractAddress
    )
  }, [allErc20Tokens, contractAddress, evmNetworkId])

  const isActive = useMemo(() => token && isTokenActive(token, activeTokens), [activeTokens, token])

  const setActive = useCallback(
    async (active: boolean) => {
      if (!token) throw new Error("Token not found")
      await activeTokensStore.setActive(token.id, active)
    },
    [token]
  )

  const toggleActive = useCallback(async () => {
    if (!token) throw new Error("Token not found")
    await setActive(!isActive)
  }, [isActive, setActive, token])

  const isActiveSetByUser = useMemo(() => token && token.id in activeTokens, [token, activeTokens])
  const resetToTalismanDefault = useCallback(() => {
    if (!token) throw new Error("Token not found")
    activeTokensStore.resetActive(token.id)
  }, [token])

  return {
    token,
    isActive: isActive,
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
