import type { TokenDto } from "@core/domains/earn/exports"
import type { Token, TokenId } from "@talismn/chaindata-provider"
import { useNetworksMapById, useTokensMap } from "@ui/state/chaindata"
import {
  getYieldxyzTokenId as getYieldxyzTokenIdInner,
  useYieldNetworkIdToTalismanNetworkIdMap,
} from "@ui/state/yieldxyz"
import { useCallback } from "react"

export const useGetYieldxyzToken = () => {
  const networksMap = useNetworksMapById()
  const tokensMap = useTokensMap()
  const mapToTalismanNetworkId = useYieldNetworkIdToTalismanNetworkIdMap()

  const getYieldxyzTokenId = useCallback(
    (token: TokenDto): TokenId | null =>
      getYieldxyzTokenIdInner(token, mapToTalismanNetworkId, networksMap),
    [mapToTalismanNetworkId, networksMap]
  )

  const getYieldxyzToken = useCallback(
    (token: TokenDto): Token | null => {
      const tokenId = getYieldxyzTokenId(token)
      if (!tokenId) return null
      return tokensMap[tokenId] ?? null
    },
    [getYieldxyzTokenId, tokensMap]
  )

  return { getYieldxyzTokenId, getYieldxyzToken }
}
