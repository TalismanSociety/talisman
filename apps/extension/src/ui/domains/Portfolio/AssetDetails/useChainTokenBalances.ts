import { Balances } from "@core/domains/balances"
import { BalanceFormatter, BalanceLockType, LockedBalance } from "@core/domains/balances/types"
import { Address } from "@core/types/base"
import { getNetworkCategory } from "@core/util/getNetworkCategory"
import { sortBigBy } from "@talisman/util/bigHelper"
import { useMemo } from "react"

import { useSelectedAccount } from "../SelectedAccountContext"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { useBalanceLocks } from "./useBalanceLocks"

type DetailRow = {
  key: BalanceLockType
  title: string
  tokens: bigint
  fiat: number | null
  locked: boolean
  address?: Address
}

type ChainTokenBalancesParams = {
  chainId: string | number
  balances: Balances
  symbol: string
}

const getBalanceLockTypeTitle = (input: BalanceLockType, allLocks: LockedBalance[]) => {
  if (!input) return input
  if (input === "democracy") return "Governance"
  if (input === "other")
    return allLocks.some(({ type }) => type !== "other") ? "Locked (other)" : "Locked"

  //capitalize
  return input.charAt(0).toUpperCase() + input.slice(1)
}

export const useChainTokenBalances = ({ chainId, balances, symbol }: ChainTokenBalancesParams) => {
  const { account } = useSelectedAccount()
  const { token, summary, tokenBalances } = useTokenBalancesSummary(balances, symbol)

  const addressesWithLocks = useMemo(
    () => [
      ...new Set(
        tokenBalances
          .filter((b) => b.frozen.planck > BigInt(0))
          .map((b) => b.address)
          .filter(Boolean) as Address[]
      ),
    ],
    [tokenBalances]
  )

  // query only locks for addresses that have frozen balance
  const { consolidatedLocks, isLoading, error, balanceLocks } = useBalanceLocks({
    chainId: chainId as string,
    addresses: addressesWithLocks,
  })

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
                .filter((b) => b.transferable.planck > BigInt(0))
                .map((b) => ({
                  key: `${b.id}-available`,
                  title: "Available",
                  tokens: BigInt(b.transferable.planck),
                  fiat: b.transferable.fiat("usd"),
                  locked: false,
                  address: b.address,
                }))
                .sort(sortBigBy("tokens", true))),
          // LOCKED
          ...(account
            ? consolidatedLocks
                .map(({ type, amount }) => ({
                  key: type,
                  title: getBalanceLockTypeTitle(type, consolidatedLocks),
                  tokens: BigInt(amount),
                  fiat: token?.rates
                    ? new BalanceFormatter(amount, token?.decimals, token.rates).fiat("usd")
                    : null,
                  locked: true,
                }))
                .sort(sortBigBy("tokens", true))
            : Object.entries(balanceLocks)
                .flatMap(([address, balances]) =>
                  balances.map(({ amount, type }) => ({
                    key: type + address,
                    title: getBalanceLockTypeTitle(type, consolidatedLocks),
                    tokens: BigInt(amount),
                    fiat: token?.rates
                      ? new BalanceFormatter(amount, token?.decimals, token.rates).fiat("usd")
                      : null,
                    locked: true,
                    address,
                  }))
                )
                .sort(sortBigBy("tokens", true))),
          // LOCKED ERROR FALLBACK
          error && {
            key: "frozen",
            title: "Frozen",
            tokens: summary.frozenTokens,
            fiat: summary.frozenFiat,
            locked: true,
          },
          ...(account
            ? [
                {
                  key: "reserved",
                  title: "Reserved",
                  tokens: summary.reservedTokens,
                  fiat: summary.reservedFiat,
                  locked: false,
                },
              ]
            : tokenBalances
                .filter((b) => b.reserved.planck > BigInt(0))
                .map((b) => ({
                  key: `${b.id}-reserved`,
                  title: "Reserved",
                  tokens: BigInt(b.reserved.planck),
                  fiat: b.reserved.fiat("usd"),
                  locked: true,
                  address: b.address,
                }))
                .sort(sortBigBy("tokens", true))),
        ].filter((row) => row && row.tokens > 0) as DetailRow[])
      : []
  }, [
    account,
    balanceLocks,
    consolidatedLocks,
    error,
    summary,
    token?.decimals,
    token?.rates,
    tokenBalances,
  ])

  const { chain, evmNetwork } = balances.sorted[0]
  const networkType = useMemo(() => getNetworkCategory({ chain, evmNetwork }), [chain, evmNetwork])

  const isFetching = useMemo(
    () => balances.sorted.some((b) => b.status === "cache") || isLoading,
    [balances, isLoading]
  )

  return {
    summary,
    token,
    detailRows,
    evmNetwork,
    chain,
    isFetching,
    networkType,
    chainOrNetwork: chain || evmNetwork,
  }
}
