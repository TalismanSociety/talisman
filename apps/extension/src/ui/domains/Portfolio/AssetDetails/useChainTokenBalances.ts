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
  key: BalanceLockType
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

  const detailRows: DetailRow[] = useMemo(() => {
    return summary
      ? ([
          // AVAILABLE
          ...(account
            ? [
                {
                  key: "available",
                  title: "Available",
                  tokens: summary.availableTokens,
                  fiat: summary.availableFiat,
                  locked: false,
                },
              ]
            : tokenBalances
                .filter((b) => b.transferable.planck > 0n)
                .map((b) => ({
                  key: `${b.id}-available`,
                  title: "Available",
                  tokens: BigNumber(b.transferable.tokens),
                  fiat: b.transferable.fiat("usd"),
                  locked: false,
                  address: b.address,
                }))
                .sort(sortBigBy("tokens", true))),
          // LOCKED
          ...tokenBalances
            .filter((b) => b.locked.planck > 0n)
            .flatMap((b) =>
              filterBaseLocks(b.locks).map((lock, index) => ({
                key: `${b.id}-locked-${index}`,
                title: getLockTitle(lock, b.locks, { balance: b }),
                tokens: BigNumber(lock.amount.tokens),
                fiat: lock.amount.fiat("usd"),
                locked: true,
                // only show address when we're viewing balances for all accounts
                address: account ? undefined : b.address,
              }))
            )
            .sort(sortBigBy("tokens", true)),
          // RESERVED
          ...tokenBalances
            .filter((b) => b.reserved.planck > 0n)
            .flatMap((b) =>
              b.reserves.map((reserve, index) => ({
                key: `${b.id}-reserved-${index}`,
                title: getLockTitle(reserve, b.reserves, { balance: b }),
                tokens: BigNumber(reserve.amount.tokens),
                fiat: reserve.amount.fiat("usd"),
                locked: true,
                // only show address when we're viewing balances for all accounts
                address: account ? undefined : b.address,
                meta: (reserve.meta as any)?.description ?? undefined,
              }))
            )
            .sort(sortBigBy("tokens", true)),
        ].filter((row) => row && row.tokens.gt(0)) as DetailRow[])
      : []
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
