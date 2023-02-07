import { Chain } from "@core/domains/chains/types"
import { useMemo } from "react"

import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

const useChainsAndSearchSymbols = <T extends Chain>(
  chains: T[]
): Array<T & { searchSymbols: string[] }> => {
  // keep shared db data up to date
  useDbCacheSubscription("tokens")

  const { tokensWithTestnetsMap } = useDbCache()

  return useMemo(
    () =>
      (chains || []).map((chain) => ({
        ...chain,
        searchSymbols: [
          // add native token symbol if it exists
          chain.nativeToken ? tokensWithTestnetsMap[chain.nativeToken.id]?.symbol : undefined,

          // add orml token symbols if they exist
          ...(chain.tokens ? chain.tokens.map(({ id }) => tokensWithTestnetsMap[id]?.symbol) : []),
        ].filter((symbol): symbol is string => typeof symbol === "string"),
      })),
    [chains, tokensWithTestnetsMap]
  )
}

export default useChainsAndSearchSymbols
