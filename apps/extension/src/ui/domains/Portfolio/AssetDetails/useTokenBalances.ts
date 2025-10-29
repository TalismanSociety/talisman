import {
  Balance,
  BalanceLockType,
  Balances,
  filterBaseLocks,
  getBalanceId,
  getLockTitle,
} from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import BigNumber from "bignumber.js"
import { Address } from "extension-core"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { sortBigBy } from "@talisman/util/bigHelper"
import { cleanupNomPoolName } from "@ui/domains/Staking/helpers"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useNetworkById, useSelectedCurrency, useToken } from "@ui/state"

import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"

export type BalanceDetailRow = {
  key: string | BalanceLockType
  title: string
  description?: string
  tokens: BigNumber
  fiat: number | null
  locked: boolean
  address?: Address
  meta?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  isLoading?: boolean
  balance: Balance | null
}

type TokenBalancesParams = {
  tokenId: TokenId
  balances: Balances
}

export type TokenBalances = ReturnType<typeof useTokenBalances>

export const useTokenBalances = ({ tokenId, balances }: TokenBalancesParams) => {
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  const { selectedAccount: account } = usePortfolioNavigation()
  const { summary, tokenBalances } = useTokenBalancesSummary(balances)
  const { t } = useTranslation()

  const currency = useSelectedCurrency()

  const detailRows = useMemo((): BalanceDetailRow[] => {
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
            balance: tokenBalances.get(getBalanceId({ address: account.address, tokenId })),
          },
        ]
      : tokenBalances.each.map((b) => ({
          key: `${b.id}-available`,
          title: t("Available"),
          tokens: BigNumber(b.transferable.tokens),
          fiat: b.transferable.fiat(currency),
          locked: false,
          address: b.address,
          balance: b,
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
        balance: b,
      })),
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
        balance: b,
      })),
    )

    // STAKED (NOM POOLS)
    const staked = tokenBalances.each.flatMap((b) =>
      b.nompools.map((nomPool, index) => ({
        key: `${b.id}-nomPool-${index}`,
        title: getLockTitle(nomPool, { balance: b }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: cleanupNomPoolName((nomPool.meta as any).description) ?? undefined,
        tokens: BigNumber(nomPool.amount.tokens),
        fiat: nomPool.amount.fiat(currency),
        locked: true,
        // only show address when we're viewing balances for all accounts
        address: account ? undefined : b.address,
        meta: nomPool.meta,
        balance: b,
      })),
    )

    return [...available, ...locked, ...reserved, ...staked]
      .filter((row) => row && row.tokens.gt(0))
      .sort(sortBigBy("tokens", true))
  }, [summary, account, t, tokenBalances, tokenId, currency])

  const status = useBalancesStatus(balances)

  return {
    summary,
    token,
    detailRows,
    status,
    network,
  }
}
