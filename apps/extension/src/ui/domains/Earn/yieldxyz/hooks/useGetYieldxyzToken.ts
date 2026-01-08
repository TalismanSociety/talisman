import { Token, TokenId } from "@talismn/chaindata-provider"
import { TokenDto } from "extension-core"
import { useCallback } from "react"

import {
  getYieldxyzTokenId as getYieldxyzTokenIdInner,
  useNetworksMapById,
  useTokensMap,
  useYieldNetworkIdToTalismanNetworkIdMap,
} from "@ui/state"

export const useGetYieldxyzToken = () => {
  const networksMap = useNetworksMapById()
  const tokensMap = useTokensMap()
  const mapToTalismanNetworkId = useYieldNetworkIdToTalismanNetworkIdMap()

  const getYieldxyzTokenId = useCallback(
    (token: TokenDto): TokenId | null =>
      getYieldxyzTokenIdInner(token, mapToTalismanNetworkId, networksMap),
    [mapToTalismanNetworkId, networksMap],
  )

  const getYieldxyzToken = useCallback(
    (token: TokenDto): Token | null => {
      const tokenId = getYieldxyzTokenId(token)
      if (!tokenId) return null
      return tokensMap[tokenId] ?? null
    },
    [getYieldxyzTokenId, tokensMap],
  )

  return { getYieldxyzTokenId, getYieldxyzToken }
}
