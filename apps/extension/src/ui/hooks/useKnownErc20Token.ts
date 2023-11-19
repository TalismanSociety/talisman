import { enabledTokensStore, isTokenEnabled } from "@core/domains/tokens/store.enabledTokens"
import { isErc20Token } from "@ui/util/isErc20Token"
import { useCallback, useMemo } from "react"

import { useEnabledTokensState } from "./useEnabledTokensState"
import useTokens from "./useTokens"

export const useKnownErc20Token = (
  evmNetworkId: string | undefined | null,
  contractAddress: string | undefined | null
) => {
  const { tokens: allTokens } = useTokens("all")
  const allErc20Tokens = useMemo(() => allTokens.filter(isErc20Token), [allTokens])

  const enabledTokens = useEnabledTokensState()

  const token = useMemo(() => {
    const lowerContractAddress = contractAddress?.toLowerCase()
    return allErc20Tokens.find(
      (t) =>
        t.evmNetwork?.id === evmNetworkId &&
        t.contractAddress.toLowerCase() === lowerContractAddress
    )
  }, [allErc20Tokens, contractAddress, evmNetworkId])

  const isEnabled = useMemo(
    () => token && isTokenEnabled(token, enabledTokens),
    [enabledTokens, token]
  )

  const setEnabled = useCallback(
    async (enable: boolean) => {
      if (!token) throw new Error("Token not found")
      await enabledTokensStore.setEnabled(token.id, enable)
    },
    [token]
  )

  const toggleEnabled = useCallback(async () => {
    if (!token) throw new Error("Token not found")
    await setEnabled(!isEnabled)
  }, [isEnabled, setEnabled, token])

  const isEnabledOrDisabledByUser = useMemo(
    () => token && token.id in enabledTokens,
    [token, enabledTokens]
  )
  const resetToTalismanDefault = useCallback(() => {
    if (!token) throw new Error("Token not found")
    enabledTokensStore.resetEnabled(token.id)
  }, [token])

  return {
    token,

    isEnabled,

    setEnabled,
    toggleEnabled,

    /**
     * If true, enabled/disabled state comes from the user configuration.
     * If false, enabled/disabled state comes from chaindata default value.
     */
    isEnabledOrDisabledByUser,
    resetToTalismanDefault,
  }
}
