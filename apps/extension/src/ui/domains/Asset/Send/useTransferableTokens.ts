import { Balance, Balances } from "@core/domains/balances"
import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { TokenId } from "@core/domains/tokens/types"
import useBalances from "@ui/hooks/useBalances"
import useTokens from "@ui/hooks/useTokens"
import { useMemo } from "react"

import { TransferableToken, TransferableTokenId } from "./types"

const nonEmptyBalancesFilter = (balance: Balance) => balance.free.planck > BigInt("0")

// return tokens list split by network (ASTR on substrate and ASTR on evm will be 2 distinct entries)
export const useTransferableTokens = (sortWithBalanceFirst = false) => {
  const balances = useBalances()
  const tokens = useTokens()

  const transferableTokens: TransferableToken[] = useMemo(() => {
    return (
      tokens?.flatMap<TransferableToken>((token) => {
        const {
          id: tokenId,
          chain,
          evmNetwork,
        } = token as { id: TokenId; chain?: Chain; evmNetwork?: EvmNetwork } // evmNetwork only exists on some of the subtypes so we need to cast

        const sortIndex = 1 + balances.sorted.findIndex((b) => b.tokenId === tokenId)

        return [
          chain &&
            ({
              id: `${tokenId}-${chain.id}`,
              chainId: chain.id,
              token,
              balances: balances?.find({ tokenId, chainId: chain.id }) ?? new Balances([]),
              sortIndex,
            } as TransferableToken),
          evmNetwork &&
            ({
              id: `${tokenId}-${evmNetwork.id}`,
              evmNetworkId: Number(evmNetwork.id),
              token,
              balances:
                balances?.find({ tokenId, evmNetworkId: evmNetwork.id }) ?? new Balances([]),
              sortIndex,
            } as TransferableToken),
        ].filter(Boolean) as TransferableToken[]
      }) ?? []
    )
  }, [balances, tokens])

  const result = useMemo(() => {
    const sorted = transferableTokens.sort(
      (a, b) =>
        (a?.sortIndex || Number.MAX_SAFE_INTEGER) - (b?.sortIndex || Number.MAX_SAFE_INTEGER)
    )

    if (!sortWithBalanceFirst) return sorted
    return sorted.sort(
      (a, b) =>
        (a.balances.find(nonEmptyBalancesFilter) ? 1 : 0) -
        (b.balances.find(nonEmptyBalancesFilter) ? 1 : 0)
    )
  }, [sortWithBalanceFirst, transferableTokens])

  return result
}

export const useTransferableTokenById = (id?: TransferableTokenId) => {
  const transferableTokens = useTransferableTokens()

  return useMemo(
    () => transferableTokens.find((tt) => tt.id === id) ?? null,
    [id, transferableTokens]
  )
}
