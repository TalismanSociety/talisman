import { activeTokensStore, isTokenActive } from "@core/domains/balances/store.activeTokens"
import type { Token } from "@talismn/chaindata-provider"
import { useActiveTokensState } from "@ui/state/chaindata"
import { useCallback, useMemo } from "react"

export const useActivableToken = (token: Token | undefined) => {
  const activeTokens = useActiveTokensState()

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
    isActive,
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
