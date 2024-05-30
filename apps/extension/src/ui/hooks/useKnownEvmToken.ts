import { activeTokensStore, isTokenActive } from "@extension/core"
import { Token } from "@talismn/chaindata-provider"
import { isErc20Token } from "@ui/util/isErc20Token"
import { isUniswapV2Token } from "@ui/util/isUniswapV2Token"
import { useCallback, useMemo } from "react"

import { useActiveTokensState } from "./useActiveTokensState"
import useTokens from "./useTokens"

/**
 * NOTE: Works for both `evm-erc20` as well as `evm-uniswapv2` tokens.
 */
export const useKnownEvmToken = (
  evmNetworkId: string | undefined | null,
  contractAddress: string | undefined | null
) => {
  const { tokens: allTokens } = useTokens({ activeOnly: false, includeTestnets: true })
  const allErc20Tokens = useMemo(
    () => allTokens.filter((t) => isErc20Token(t) || isUniswapV2Token(t)),
    [allTokens]
  )

  const activeTokens = useActiveTokensState()

  const token = useMemo(() => {
    const lowerContractAddress = contractAddress?.toLowerCase()

    const isErc20ByAddress = (t: Token) =>
      isErc20Token(t) && t.contractAddress.toLowerCase() === lowerContractAddress
    const isUniswapV2ByAddress = (t: Token) =>
      isUniswapV2Token(t) && t.contractAddress.toLowerCase() === lowerContractAddress

    const isToken = (t: Token) => isErc20ByAddress(t) || isUniswapV2ByAddress(t)

    return allErc20Tokens.find((t) => t.evmNetwork?.id === evmNetworkId && isToken(t))
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
