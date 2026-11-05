import type { AddressesAndTokens } from "@core/domains/balances/types"
import { useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useTokensMap } from "@ui/state/chaindata"
import { useMemo } from "react"
import type { Holding, HoldingKey } from "./quote-sorting"

const sortedUnique = (values: string[]) => [...new Set(values)].sort()

/**
 * The transferable balance of each address and token, in the order given, or null while the balances load.
 * The balances subscription leaves out empty balances, so a token it does not return is held at zero.
 */
export const useHoldings = (keys: HoldingKey[]): Holding[] | null => {
  const keysJson = JSON.stringify([
    ...new Map(keys.map((key) => [`${key.address}|${key.tokenId}`, key])).values(),
  ])
  const paramsJson = JSON.stringify({
    addresses: sortedUnique(keys.map(({ address }) => address)),
    tokenIds: sortedUnique(keys.map(({ tokenId }) => tokenId)),
  })
  const addressesAndTokens = useMemo<AddressesAndTokens>(() => JSON.parse(paramsJson), [paramsJson])
  const { status, balances } = useBalancesByParams({ addressesAndTokens })
  const tokensMap = useTokensMap()

  return useMemo(() => {
    const uniqueKeys = JSON.parse(keysJson) as HoldingKey[]
    if (!uniqueKeys.length) return []
    if (status !== "live") return null
    return uniqueKeys.flatMap(({ address, tokenId }) => {
      const token = tokensMap[tokenId]
      if (!token) return []
      const balance = balances.find({ address, tokenId }).each[0]
      return [
        {
          address,
          tokenId,
          decimals: token.decimals,
          transferable: balance?.transferable.planck ?? 0n,
        },
      ]
    })
  }, [status, balances, tokensMap, keysJson])
}
