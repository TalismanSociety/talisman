import { Balance, Balances } from "@core/domains/balances"
import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { TokenId } from "@core/domains/tokens/types"
import useBalances from "@ui/hooks/useBalances"
import useTokens from "@ui/hooks/useTokens"
import { useMemo } from "react"

import { TransferableToken, TransferableTokenId } from "./types"

const nonEmptyBalancesFilter = (balance: Balance) => balance.free.planck > BigInt("0")

/**
 *
 * @returns tokens list split by network (ASTR on substrate and ASTR on evm will be 2 distinct entries)
 */
export const useTransferableTokens = () => {
  const tokens = useTokens()

  const transferableTokens = useMemo(() => {
    return (
      tokens?.flatMap((token) => {
        const {
          id: tokenId,
          chain,
          evmNetwork,
        } = token as { id: TokenId; chain?: Chain; evmNetwork?: EvmNetwork } // evmNetwork only exists on some of the subtypes so we need to cast

        return [
          chain && {
            id: `${tokenId}-${chain.id}`,
            chainId: chain.id,
            token,
          },
          evmNetwork && {
            id: `${tokenId}-${evmNetwork.id}`,
            evmNetworkId: Number(evmNetwork.id),
            token,
          },
        ].filter(Boolean) as TransferableToken[]
      }) ?? []
    )
  }, [tokens])

  return transferableTokens
}

/**
 * sorted version, should only be used in asset picker
 */
export const useSortedTransferableTokens = (withBalanceFirst = false) => {
  const transferableTokens = useTransferableTokens()
  const balances = useBalances()

  const sortable = useMemo(() => {
    return transferableTokens.map((transferableToken) => {
      const sortIndex =
        1 + balances.sorted.findIndex((b) => b.tokenId === transferableToken.token.id)
      const balanceFilter = transferableToken.chainId
        ? { chainId: transferableToken.chainId }
        : { evmNetworkId: transferableToken.evmNetworkId }
      return {
        ...transferableToken,
        sortIndex,
        balances: balances?.find(balanceFilter) ?? new Balances([]),
      }
    })
  }, [balances, transferableTokens])

  const results = useMemo(() => {
    const sorted = sortable.sort(
      (a, b) =>
        (a?.sortIndex || Number.MAX_SAFE_INTEGER) - (b?.sortIndex || Number.MAX_SAFE_INTEGER)
    )

    if (!withBalanceFirst) return sorted
    return sorted.sort(
      (a, b) =>
        (a.balances.find(nonEmptyBalancesFilter) ? 1 : 0) -
        (b.balances.find(nonEmptyBalancesFilter) ? 1 : 0)
    )
  }, [withBalanceFirst, sortable])

  // keep only TransferableToken fields
  return results.map<TransferableToken>(({ id, chainId, evmNetworkId, token }) => ({
    id,
    chainId,
    evmNetworkId,
    token,
  }))
}

export const useTransferableTokenById = (id?: TransferableTokenId) => {
  const transferableTokens = useTransferableTokens()

  return useMemo(
    () => transferableTokens.find((tt) => tt.id === id) ?? undefined,
    [id, transferableTokens]
  )
}

export const useTransferableTokenId = ({
  tokenId,
  chainId,
  evmNetworkId,
}: {
  tokenId: string
  chainId?: string
  evmNetworkId?: number
}) => {
  const items = useTransferableTokens()
  const result = items.find(
    (tt) =>
      tt.token.id === tokenId &&
      ((chainId && tt.chainId === chainId) ||
        (evmNetworkId && Number(tt.evmNetworkId) === Number(evmNetworkId)))
  )
  return result?.id ?? undefined
}
