import { Address, Balances } from "@extension/core"
import { sortBigBy } from "@talisman/util/bigHelper"
import { BalanceLockType, filterBaseLocks, getLockTitle } from "@talismn/balances"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import useChain from "@ui/hooks/useChain"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useNetworkCategory } from "@ui/hooks/useNetworkCategory"
import BigNumber from "bignumber.js"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useSelectedAccount } from "../useSelectedAccount"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"

export type DetailRow = {
  key: string | BalanceLockType
  title: string
  description?: string
  tokens: BigNumber
  fiat: number | null
  locked: boolean
  address?: Address
  meta?: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

type ChainTokenBalancesParams = {
  chainId: ChainId | EvmNetworkId
  balances: Balances
}

export const useChainTokenBalances = ({ chainId, balances }: ChainTokenBalancesParams) => {
  const chain = useChain(chainId)

  const { account } = useSelectedAccount()
  const { summary, tokenBalances, token } = useTokenBalancesSummary(balances)
  const { t } = useTranslation()

  const currency = useSelectedCurrency()

  const detailRows = useMemo((): DetailRow[] => {
    if (!summary) return []

    // AVAILABLE
    const available = account
      ? [
          {
            key: "available",
            title: t("Available"),
            tokens: summary.availableTokens,
            fiat: summary.availableFiat,
            locked: false,
          },
        ]
      : tokenBalances.each.map((b) => ({
          key: `${b.id}-available`,
          title: t("Available"),
          tokens: BigNumber(b.transferable.tokens),
          fiat: b.transferable.fiat(currency),
          locked: false,
          address: b.address,
        }))

    // LOCKED
    const locked = tokenBalances.each.flatMap((b) =>
      filterBaseLocks(b.locks).map((lock, index) => ({
        key: `${b.id}-locked-${index}`,
        title: getLockTitle(lock, { balance: b }),
        tokens: BigNumber(lock.amount.tokens),
        fiat: lock.amount.fiat(currency),
        locked: true,
        // only show address when we're viewing balances for all accounts
        address: account ? undefined : b.address,
      }))
    )

    // RESERVED
    const reserved = tokenBalances.each.flatMap((b) =>
      b.reserves.map((reserve, index) => ({
        key: `${b.id}-reserved-${index}`,
        title: getLockTitle(reserve, { balance: b }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: (reserve.meta as any)?.description ?? undefined,
        tokens: BigNumber(reserve.amount.tokens),
        fiat: reserve.amount.fiat(currency),
        locked: true,
        // only show address when we're viewing balances for all accounts
        address: account ? undefined : b.address,
        meta: reserve.meta,
      }))
    )

    // STAKED (NOM POOLS)
    const staked = tokenBalances.each.flatMap((b) =>
      b.nompools.map((nomPool, index) => ({
        key: `${b.id}-nomPool-${index}`,
        title: getLockTitle(nomPool, { balance: b }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: (nomPool.meta as any)?.description ?? undefined,
        tokens: BigNumber(nomPool.amount.tokens),
        fiat: nomPool.amount.fiat(currency),
        locked: true,
        // only show address when we're viewing balances for all accounts
        address: account ? undefined : b.address,
        meta: nomPool.meta,
      }))
    )

    // CROWDLOANS
    const crowdloans = tokenBalances.each.flatMap((b) =>
      b.crowdloans.map((crowdloan, index) => ({
        key: `${b.id}-crowdloan-${index}`,
        title: getLockTitle(crowdloan, { balance: b }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: (crowdloan.meta as any)?.description ?? undefined,
        tokens: BigNumber(crowdloan.amount.tokens),
        fiat: crowdloan.amount.fiat(currency),
        locked: true,
        // only show address when we're viewing balances for all accounts
        address: account ? undefined : b.address,
        meta: crowdloan.meta,
      }))
    )

    return [...available, ...locked, ...reserved, ...staked, ...crowdloans]
      .filter((row) => row && row.tokens.gt(0))
      .sort(sortBigBy("tokens", true))
  }, [summary, account, t, tokenBalances, currency])

  const { evmNetwork } = balances.sorted[0]
  const relay = useChain(chain?.relay?.id)
  const networkType = useNetworkCategory({ chain, evmNetwork, relay })

  const status = useBalancesStatus(balances)

  return {
    summary,
    tokenId: token?.id, // there could be more than one token with same symbol, use this only for icon
    symbol: token?.symbol,
    detailRows,
    evmNetwork,
    chain,
    status,
    networkType,
    chainOrNetwork: chain || evmNetwork,
  }
}
