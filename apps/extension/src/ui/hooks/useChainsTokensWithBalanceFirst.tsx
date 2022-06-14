import { useCallback, useMemo } from "react"
import { Balance, Token } from "@core/types"
import useBalances from "@ui/hooks/useBalances"

/**
 * Will return the array sorted like [...tokensWithBalance, ...tokensWithoutBalance]
 *
 * @param tokens to sort
 * @returns A sorted array of tokens
 */
export const useChainsTokensWithBalanceFirst = (tokens: Token[], address?: string) => {
  const balances = useBalances()
  const nonEmptyBalancesFilter = useMemo(
    () =>
      typeof address === "string"
        ? (balance: Balance) => balance.free.planck > BigInt("0") && balance.address === address
        : (balance: Balance) => balance.free.planck > BigInt("0"),
    [address]
  )
  const nonEmptyBalances = useMemo(
    () => balances?.find(nonEmptyBalancesFilter) || [],
    [balances, nonEmptyBalancesFilter]
  )
  const nonEmptyTokensMap = useMemo(
    () => Object.fromEntries([...nonEmptyBalances].map((balance) => [balance.tokenId, true])),
    [nonEmptyBalances]
  )

  const hasBalance = useCallback(
    (token: Token) => !!nonEmptyTokensMap[token.id],
    [nonEmptyTokensMap]
  )

  return useMemo(
    () => [...tokens].sort((a, b) => (hasBalance(b) ? 1 : 0) - (hasBalance(a) ? 1 : 0)),
    [hasBalance, tokens]
  )
}
