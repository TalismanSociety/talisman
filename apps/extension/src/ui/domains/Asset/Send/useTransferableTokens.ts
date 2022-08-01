import { Balance, Balances } from "@core/domains/balances"
import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { Token, TokenId } from "@core/domains/tokens/types"
import { Address } from "@core/types/base"
import useBalances from "@ui/hooks/useBalances"
import useTokens from "@ui/hooks/useTokens"
import { useMemo } from "react"

// we want a different shape here to ensure Token and TransferableTokens can't be used in same context, as ids don't match
export type TransferableToken = {
  id: string
  chainId?: string
  evmNetworkId?: number
  token: Token
  balances: Balances
}

const nonEmptyBalancesFilter = (balance: Balance) => balance.free.planck > BigInt("0")

export const useTransferableTokens = (address?: Address, sortWithBalanceFirst = false) => {
  const tokens = useTokens()
  const balances = useBalances()

  const addressBalances = useMemo(() => {
    if (!address) return balances
    return balances.find({ address })
  }, [address, balances])

  const transferableTokens = useMemo(
    () =>
      tokens?.flatMap<TransferableToken>((token) => {
        const {
          id: tokenId,
          chain,
          evmNetwork,
        } = token as { id: TokenId; chain?: Chain; evmNetwork?: EvmNetwork } // evmNetwork only exist on some subtypes

        const transferables = [
          chain &&
            ({
              id: `${tokenId}-${chain.id}`,
              chainId: chain.id,
              token,
              balances: addressBalances?.find({ tokenId, chainId: chain.id }) ?? new Balances([]),
            } as TransferableToken),
          evmNetwork &&
            ({
              id: `${tokenId}-${evmNetwork.id}`,
              evmNetworkId: evmNetwork.id,
              token,
              balances:
                addressBalances?.find({ tokenId, evmNetworkId: evmNetwork.id }) ?? new Balances([]),
            } as TransferableToken),
        ].filter(Boolean) as TransferableToken[]

        return transferables
      }) ?? [],
    [addressBalances, tokens]
  )

  const result = useMemo(() => {
    if (!sortWithBalanceFirst) return transferableTokens
    return [...transferableTokens].sort(
      (a, b) =>
        (a.balances.find(nonEmptyBalancesFilter) ? 1 : 0) -
        (b.balances.find(nonEmptyBalancesFilter) ? 1 : 0)
    )
  }, [sortWithBalanceFirst, transferableTokens])

  return result
}
