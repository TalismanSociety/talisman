import { Balances } from "@core/domains/balances/types"
import { Address } from "@core/types/base"
import { getNetworkCategory } from "@core/util/getNetworkCategory"
import { sortBigBy } from "@talisman/util/bigHelper"
import { useBalancesStatus } from "@talismn/balances-react"
import { BalanceLockType, filterBaseLocks, getLockTitle } from "@talismn/balances-substrate-native"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import useChain from "@ui/hooks/useChain"
import BigNumber from "bignumber.js"
import { useMemo } from "react"

import { useSelectedAccount } from "../SelectedAccountContext"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"

type DetailRow = {
  key: string | BalanceLockType
  title: string
  tokens: BigNumber
  fiat: number | null
  locked: boolean
  address?: Address
  meta?: string
}

type ChainTokenBalancesParams = {
  chainId: ChainId | EvmNetworkId
  balances: Balances
}

export const useChainTokenBalances = ({ chainId, balances }: ChainTokenBalancesParams) => {
  const chain = useChain(chainId)

  const { account } = useSelectedAccount()
  const { summary, tokenBalances, token } = useTokenBalancesSummary(balances)

  const detailRows = useMemo((): DetailRow[] => {
    if (!summary) return []

    // AVAILABLE
    const available = account
      ? [
          {
            key: "available",
            title: "Available",
            tokens: summary.availableTokens,
            fiat: summary.availableFiat,
            locked: false,
          },
        ]
      : tokenBalances.filterNonZero("transferable").each.map((b) => ({
          key: `${b.id}-available`,
          title: "Available",
          tokens: BigNumber(b.transferable.tokens),
          fiat: b.transferable.fiat("usd"),
          locked: false,
          address: b.address,
        }))

    // LOCKED
    const locked = tokenBalances.filterNonZero("locked").each.flatMap((b) =>
      filterBaseLocks(b.locks).map((lock, index) => ({
        key: `${b.id}-locked-${index}`,
        title: getLockTitle(lock, { balance: b }),
        tokens: BigNumber(lock.amount.tokens),
        fiat: lock.amount.fiat("usd"),
        locked: true,
        // only show address when we're viewing balances for all accounts
        address: account ? undefined : b.address,
      }))
    )

    // RESERVED
    const reserved = tokenBalances.filterNonZero("reserved").each.flatMap((b) =>
      b.reserves.map((reserve, index) => ({
        key: `${b.id}-reserved-${index}`,
        title: getLockTitle(reserve, { balance: b }),
        tokens: BigNumber(reserve.amount.tokens),
        fiat: reserve.amount.fiat("usd"),
        locked: true,
        // only show address when we're viewing balances for all accounts
        address: account ? undefined : b.address,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: (reserve.meta as any)?.description ?? undefined,
      }))
    )

    return [...available, ...locked, ...reserved]
      .filter((row) => row && row.tokens.gt(0))
      .sort(sortBigBy("tokens", true))
  }, [account, summary, tokenBalances])

  const { evmNetwork } = balances.sorted[0]
  const relay = useChain(chain?.relay?.id)
  const networkType = useMemo(
    () => getNetworkCategory({ chain, evmNetwork, relay }),
    [chain, evmNetwork, relay]
  )

  const status = useBalancesStatus(balances)

  return {
    summary,
    symbol: token?.symbol,
    detailRows,
    evmNetwork,
    chain,
    status,
    networkType,
    chainOrNetwork: chain || evmNetwork,
  }
}
