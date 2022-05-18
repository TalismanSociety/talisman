import { Chain } from "@core/types"
import { useMemo } from "react"
import useTokens from "@ui/hooks/useTokens"

export const useChainsTokens = (chains: Chain[]) => {
  const chainList = useMemo(
    () => Object.fromEntries(chains.map((chain) => [chain.id, chain])),
    [chains]
  )
  const tokens = useTokens()

  return useMemo(() => {
    return Object.values(tokens)
      .filter((token) => {
        const chain = chainList[token.chainId]
        if (!chain) return false

        // TODO: Fix KINT
        // Acala uses the balances pallet for its nativeToken.
        // Kintsugi uses the orml pallet for its nativeToken.
        // ...is there a way for us to automatically determine which is in use?
        const tokenType = token.type
        if (tokenType === "native") return true
        if (tokenType === "orml") {
          const nativeToken = chain.nativeToken ? tokens[chain.nativeToken.id] : undefined
          if (!nativeToken) return true
          if (token.symbol !== nativeToken.symbol) return true
          return false
        }

        // force compilation error if any token types don't have a case
        const exhaustiveCheck: never = tokenType
        throw new Error(`Unhandled token type ${exhaustiveCheck}`)
      })
      .sort((a, b) => (chainList[a.chainId].sortIndex || 0) - (chainList[b.chainId].sortIndex || 0))
  }, [tokens, chainList])
}
