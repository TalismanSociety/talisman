import { Balances } from "@core/domains/balances/types"
import { Chain, ChainId } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { Token } from "@core/domains/tokens/types"
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
        if (tokenType === "substrate-native") {
          return !chainUsesOrmlForNativeToken(nonEmptyBalances, chain.id, token)
        }
        if (tokenType === "evm-native") return true
        if (tokenType === "substrate-orml") {
          const nativeToken = chain.nativeToken ? tokensMap[chain.nativeToken.id] : undefined
          if (!nativeToken) return true
          if (token.symbol !== nativeToken.symbol) return true
          return chainUsesOrmlForNativeToken(nonEmptyBalances, chain.id, nativeToken)
        }
        if (tokenType === "evm-erc20") return true
        if (tokenType === "substrate-assets") return true
        if (tokenType === "substrate-tokens") return true

        // force compilation error if any token types don't have a case
        const exhaustiveCheck: never = tokenType
        console.warn(`Unhandled token type ${exhaustiveCheck}`) // eslint-disable-line no-console
        return false
      })
      .sort(
        ([aChainId], [bChainId]) =>
          ((aChainId !== undefined && chainList[aChainId].sortIndex) || Number.MAX_SAFE_INTEGER) -
          ((bChainId !== undefined && chainList[bChainId].sortIndex) || Number.MAX_SAFE_INTEGER)
      )
      .map(([, token]) => token)
  }, [tokens, chainList, tokensMap, nonEmptyBalances])
}

// Acala uses the substrate-native source for its nativeToken.
// Kintsugi uses the substrate-orml source for its nativeToken.
//
// To automatically determine which is in use, for the nativeToken we will:
//  - Default to using the substrate-native source, disable the substrate-orml source.
//  - Check if any accounts have a non-zero balance on the substrate-orml source.
//  - If so, disable the substrate-native source and enable the substrate-orml source.
export function chainUsesOrmlForNativeToken(
  nonEmptyBalances: Balances,
  chainId: ChainId,
  nativeToken: Token
): boolean {
  return (
    nonEmptyBalances
      .find({ chainId, source: "substrate-orml" })
      .find((balance) => balance.token?.symbol === nativeToken.symbol).count > 0
  )
}
