import { Chain, EvmNetwork } from "@core/types"
import { useMemo } from "react"
import useTokens from "@ui/hooks/useTokens"

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

        // TODO: Fix KINT
        // Acala uses the balances pallet for its nativeToken.
        // Kintsugi uses the orml pallet for its nativeToken.
        // ...is there a way for us to automatically determine which is in use?
        const tokenType = token.type
        if (tokenType === "native") return true
        if (tokenType === "orml") {
          const nativeToken = chain.nativeToken ? tokensMap[chain.nativeToken.id] : undefined
          if (!nativeToken) return true
          if (token.symbol !== nativeToken.symbol) return true
          return false
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
  }, [tokens, chainList, tokensMap])
}
