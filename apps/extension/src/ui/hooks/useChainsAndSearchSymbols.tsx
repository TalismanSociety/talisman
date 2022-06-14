import { useMemo } from "react"
import { Chain } from "@core/types"
import useTokens from "@ui/hooks/useTokens"

const useChainsAndSearchSymbols = <T extends Chain>(
  chains: T[]
): Array<T & { searchSymbols: string[] }> => {
  const tokens = useTokens()
  const tokensMap = useMemo(
    () => Object.fromEntries((tokens || []).map((token) => [token.id, token])),
    [tokens]
  )
  return useMemo(
    () =>
      (chains || []).map((chain) => ({
        ...chain,
        searchSymbols: [
          // add native token symbol if it exists
          chain.nativeToken ? tokensMap[chain.nativeToken.id]?.symbol : undefined,

          // add orml token symbols if they exist
          ...(chain.tokens ? chain.tokens.map(({ id }) => tokensMap[id]?.symbol) : []),
        ].filter((symbol): symbol is string => typeof symbol === "string"),
      })),
    [chains, tokensMap]
  )
}

export default useChainsAndSearchSymbols
