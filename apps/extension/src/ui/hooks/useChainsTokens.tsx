import { Balances, Chain, ChainId, EvmNetwork, Token } from "@core/types"
import useBalances from "@ui/hooks/useBalances"
import useTokens from "@ui/hooks/useTokens"
import { useMemo } from "react"

export const useChainsTokens = (chains: Chain[], evmNetworks?: EvmNetwork[]) => {
  const chainList = useMemo(
    () =>
      Object.fromEntries([
        ...chains.map((chain) => [chain.id, chain]),
        ...(evmNetworks || []).map((evmNetwork) => [evmNetwork.id, evmNetwork]),
      ]),
    [chains, evmNetworks]
  )
  const tokens = useTokens()
  const tokensMap = useMemo(
    () => Object.fromEntries((tokens || []).map((token) => [token.id, token])),
    [tokens]
  )

  const balances = useBalances()
  const nonEmptyBalances = useMemo(
    () =>
      balances ? balances.find((balance) => balance.free.planck > BigInt("0")) : new Balances([]),
    [balances]
  )

  return useMemo(() => {
    return (tokens || [])
      .map((token) => {
        const chainId =
          ("chain" in token && token.chain?.id) ||
          ("evmNetwork" in token && token.evmNetwork?.id) ||
          undefined

        return [chainId, token] as const
      })
      .filter(([chainId, token]) => {
        const chain = chainId !== undefined ? chainList[chainId] : undefined
        if (!chain) return false

        const tokenType = token.type
        if (tokenType === "native") {
          return !chainUsesOrmlForNativeToken(nonEmptyBalances, chain.id, token)
        }
        if (tokenType === "orml") {
          const nativeToken = chain.nativeToken ? tokensMap[chain.nativeToken.id] : undefined
          if (!nativeToken) return true
          if (token.symbol !== nativeToken.symbol) return true
          return chainUsesOrmlForNativeToken(nonEmptyBalances, chain.id, nativeToken)
        }
        if (tokenType === "erc20") return true

        // force compilation error if any token types don't have a case
        const exhaustiveCheck: never = tokenType
        throw new Error(`Unhandled token type ${exhaustiveCheck}`)
      })
      .sort(
        ([aChainId], [bChainId]) =>
          ((aChainId !== undefined && chainList[aChainId].sortIndex) || Number.MAX_SAFE_INTEGER) -
          ((bChainId !== undefined && chainList[bChainId].sortIndex) || Number.MAX_SAFE_INTEGER)
      )
      .map(([, token]) => token)
  }, [tokens, chainList, tokensMap, nonEmptyBalances])
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
      .find((balance) => balance.token?.symbol === nativeToken.symbol).count > 0
  )
}
