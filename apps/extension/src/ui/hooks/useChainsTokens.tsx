import { Balances, Chain, ChainId, Token } from "@core/types"
import { useMemo } from "react"
import useTokens from "@ui/hooks/useTokens"
import useBalances from "@ui/hooks/useBalances"

export const useChainsTokens = (chains: Chain[]) => {
  const chainList = useMemo(
    () => Object.fromEntries(chains.map((chain) => [chain.id, chain])),
    [chains]
  )
  const tokens = useTokens()

  const balances = useBalances()
  const nonEmptyBalances = useMemo(
    () => balances.find((balance) => balance.free.planck > BigInt("0")),
    [balances]
  )

  return useMemo(() => {
    return Object.values(tokens)
      .filter((token) => {
        const chain = chainList[token.chainId]
        if (!chain) return false

        const tokenType = token.type
        if (tokenType === "native") {
          return !chainUsesOrmlForNativeToken(nonEmptyBalances, chain.id, token)
        }
        if (tokenType === "orml") {
          const nativeToken = chain.nativeToken ? tokens[chain.nativeToken.id] : undefined
          if (!nativeToken) return true
          if (token.symbol !== nativeToken.symbol) return true
          return chainUsesOrmlForNativeToken(nonEmptyBalances, chain.id, nativeToken)
        }

        // force compilation error if any token types don't have a case
        const exhaustiveCheck: never = tokenType
        throw new Error(`Unhandled token type ${exhaustiveCheck}`)
      })
      .sort((a, b) => (chainList[a.chainId].sortIndex || 0) - (chainList[b.chainId].sortIndex || 0))
  }, [tokens, chainList, nonEmptyBalances])
}

// Acala uses the balances pallet for its nativeToken.
// Kintsugi uses the orml pallet for its nativeToken.
//
// To automatically determine which is in use, for the nativeToken we will:
//  - Default to using the balances pallet, disable the orml pallet.
//  - Check if any accounts have a non-zero balance on the orml pallet.
//  - If so, disable the balances pallet and enable the orml pallet.
export function chainUsesOrmlForNativeToken(
  nonEmptyBalances: Balances,
  chainId: ChainId,
  nativeToken: Token
): boolean {
  return (
    nonEmptyBalances
      .find({ chainId, pallet: "orml-tokens" })
      .find((balance) => balance.token?.token === nativeToken.token).count > 0
  )
}
