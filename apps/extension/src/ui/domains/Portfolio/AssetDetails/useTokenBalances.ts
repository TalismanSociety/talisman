import { BalanceLockType, filterBaseLocks, getLockTitle } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import BigNumber from "bignumber.js"
import { Address, Balances } from "extension-core"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { sortBigBy } from "@talisman/util/bigHelper"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
import { cleanupNomPoolName } from "@ui/domains/Staking/helpers"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/hooks/bittensor/useCombinedBittensorValidatorsData"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useNetworkCategory } from "@ui/hooks/useNetworkCategory"
import { useChain, useSelectedCurrency, useToken } from "@ui/state"

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
}

type TokenBalancesParams = {
  tokenId: TokenId
  balances: Balances
}

export type TokenBalances = ReturnType<typeof useTokenBalances>

export const useTokenBalances = ({ tokenId, balances }: TokenBalancesParams) => {
  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)

  const { selectedAccount: account } = usePortfolioNavigation()
  const { summary, tokenBalances } = useTokenBalancesSummary(balances)
  const { t } = useTranslation()

  const currency = useSelectedCurrency()

  const rawDetailRows = useMemo((): BalanceDetailRow[] => {
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
      })),
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
      })),
    )

    // BITTENSOR
    const subtensor = tokenBalances.each.flatMap((b) =>
      b.subtensor.map((subtensor, index) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { meta } = subtensor as any
        const rootTitle = getLockTitle({
          label: "subtensor-staking",
        })

        return {
          key: `${b.id}-subtensor-${index}`,
          title: meta.netuid === ROOT_NETUID ? rootTitle : "Subnet Staking",
          description: meta?.description ?? undefined,
          tokens: BigNumber(subtensor.amount.tokens),
          fiat: subtensor.amount.fiat(currency),
          locked: true,
          // only show address when we're viewing balances for all accounts
          address: account ? undefined : b.address,
          meta: meta,
        }
      }),
    )

    return [...available, ...locked, ...reserved, ...staked, ...crowdloans, ...subtensor]
      .filter((row) => row && row.tokens.gt(0))
      .sort(sortBigBy("tokens", true))
  }, [summary, account, t, tokenBalances, currency])

  const detailRows = useEnhanceDetailRows(rawDetailRows)

  const { evmNetwork } = useMemo(() => balances.sorted[0], [balances])

  const relay = useChain(chain?.relay?.id)
  const networkType = useNetworkCategory({ chain, evmNetwork, relay })

  const status = useBalancesStatus(balances)

  return {
    summary,
    token,
    detailRows,
    evmNetwork,
    chain,
    status,
    networkType,
    chainOrNetwork: chain || evmNetwork,
  }
}

const useEnhanceDetailRows = (detailRows: BalanceDetailRow[]) => {
  const { combinedValidatorsData, isLoading: isLoadingCombinedValidators } =
    useCombinedBittensorValidatorsData()

  return useMemo(() => {
    return detailRows
      .map((row) => {
        if (row.meta?.type === "subtensor-staking")
          return {
            ...row,
            description:
              combinedValidatorsData?.find((v) => v?.poolId === row.meta.hotkey)?.name ??
              "Managed delegation",
            isLoading: isLoadingCombinedValidators,
          } as BalanceDetailRow

        return row
      })
      .sort((a, b) => {
        if (a.key === "available") return -1 // "available" always first
        if (b.key === "available") return 1

        if (a.title === "Reserved") return -1 // "reserved" always second
        if (b.title === "Reserved") return 1

        if (a.meta?.netuid === 0 && b.meta?.netuid !== 0) return -1 // Move netuid === 0 after reserved
        if (b.meta?.netuid === 0 && a.meta?.netuid !== 0) return 1

        return 0 // Preserve relative order for others
      })
  }, [detailRows, combinedValidatorsData, isLoadingCombinedValidators])
}
