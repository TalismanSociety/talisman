import { TokenId } from "@talismn/chaindata-provider"

import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export function useTokens(withTestnets?: boolean) {
  // keep db data up to date
  useDbCacheSubscription("tokens")

  const { tokensWithTestnetsMap, tokensWithoutTestnetsMap } = useDbCache()
  return withTestnets ? tokensWithTestnetsMap : tokensWithoutTestnetsMap
}

export function useToken(tokenId?: TokenId, withTestnets?: boolean) {
  const tokens = useTokens(withTestnets)
  return tokenId ? tokens[tokenId] : undefined
}
