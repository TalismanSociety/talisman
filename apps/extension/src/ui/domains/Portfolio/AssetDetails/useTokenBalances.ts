import type { Address } from "@core/types/base"
import {
  type Balance,
  type BalanceLockType,
  type Balances,
  filterBaseLocks,
  findDTaoConvictionLock,
  type GammaDepositStatus,
  getBalanceId,
  getGammaDeposits,
  getLockTitle,
  isDTaoClaimableLock,
  isEvmMirrorWithdrawableLock,
} from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { planckToTokens } from "@talismn/util"
import { cleanupNomPoolName } from "@ui/domains/Staking/helpers"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { sortBigBy } from "@ui/util/bigHelper"
import BigNumber from "bignumber.js"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"

export type GammaDepositRow = {
  spendable: BigNumber
  dailySpendCap: BigNumber | null
  status: GammaDepositStatus
}

export type BalanceDetailRow = {
  key: string | BalanceLockType
  title: string
  description?: string
  tokens: BigNumber
  fiat: number | null
  locked: boolean
  address?: Address
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  meta?: any
  /** validator of a dtao conviction lock, or API key of a gamma deposit, if this row is one */
  hotkey?: string
  gammaDeposit?: GammaDepositRow
  isLoading?: boolean
  balance: Balance | null
}

const toTokens = (planck: bigint, decimals: number) =>
  BigNumber(planckToTokens(planck.toString(), decimals))

type TokenBalancesParams = {
  tokenId: TokenId
  balances: Balances
}

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
        // dtao conviction locks are keyed to a validator (hotkey) — surface it on the row
        hotkey: findDTaoConvictionLock([lock])?.hotkey,
        meta: isDTaoClaimableLock(lock)
          ? { claimable: true }
          : isEvmMirrorWithdrawableLock(lock)
            ? { evmMirrorWithdraw: true }
            : undefined,
        balance: b,
      }))
    )

    // RESERVED
    const reserved = tokenBalances.each.flatMap((b): BalanceDetailRow[] => {
      const token = b.token
      if (token?.type === "substrate-gamma")
        return getGammaDeposits(b.toJSON()).map(
          ({ hotkey, balance, spendable, dailySpendCap, status }) => ({
            key: `${b.id}-gamma-${hotkey}`,
            title: t("API key"),
            tokens: toTokens(balance, token.decimals),
            fiat: null,
            locked: true,
            address: account ? undefined : b.address,
            hotkey,
            gammaDeposit: {
              spendable: toTokens(spendable, token.decimals),
              dailySpendCap:
                dailySpendCap === null ? null : toTokens(dailySpendCap, token.decimals),
              status,
            },
            balance: b,
          })
        )

      return b.reserves.map((reserve, index) => ({
        key: `${b.id}-reserved-${index}`,
        title: getLockTitle(reserve, { balance: b }),
        // biome-ignore lint/suspicious/noExplicitAny: legacy
        description: (reserve.meta as any)?.description ?? undefined,
        tokens: BigNumber(reserve.amount.tokens),
        fiat: reserve.amount.fiat(currency),
        locked: true,
        // only show address when we're viewing balances for all accounts
        address: account ? undefined : b.address,
        meta: reserve.meta,
        balance: b,
      }))
    })

    // STAKED (NOM POOLS)
    const staked = tokenBalances.each.flatMap((b) =>
      b.nompools.map((nomPool, index) => ({
        key: `${b.id}-nomPool-${index}`,
        title: getLockTitle(nomPool, { balance: b }),
        // biome-ignore lint/suspicious/noExplicitAny: legacy
        description: cleanupNomPoolName((nomPool.meta as any).description) ?? undefined,
        tokens: BigNumber(nomPool.amount.tokens),
        fiat: nomPool.amount.fiat(currency),
        locked: true,
        // only show address when we're viewing balances for all accounts
        address: account ? undefined : b.address,
        meta: nomPool.meta,
        balance: b,
      }))
    )

    return [...available, ...locked, ...reserved, ...staked]
      .filter((row) => row?.tokens.gt(0))
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
