import { TokenId } from "@talismn/chaindata-provider"
import { ActiveTokens, activeTokensStore, isTokenActive } from "extension-core"
import { log } from "extension-shared"
import { useCallback } from "react"

import { useActiveTokensState, useTokensMap } from "@ui/state"

export const useEnableTokens = () => {
  const activeTokens = useActiveTokensState()
  const tokens = useTokensMap()

  const enableTokens = useCallback(
    async (tokenIds: TokenId[]) => {
      const tokenIdsToActivate = tokenIds.filter((tokenId) => {
        const token = tokens[tokenId]
        if (!token) return false
        return !isTokenActive(token, activeTokens)
      })

      if (tokenIdsToActivate.length === 0) return

      try {
        await activeTokensStore.mutate((state) => ({
          ...state,
          ...tokenIdsToActivate.reduce((acc, tokenId) => {
            acc[tokenId] = true
            return acc
          }, {} as ActiveTokens),
        }))
      } catch (err) {
        // non critical, dont throw
        log.error("Failed to activate tokens", { err, tokenIdsToActivate })
      }
    },
    [activeTokens, tokens],
  )

  return { enableTokens }
}
