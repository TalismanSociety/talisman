import { Balances } from "@core/domains/balances"
import { BalanceFormatter, BalanceLockType, LockedBalance } from "@core/domains/balances/types"
import { Address } from "@core/types/base"
import { useMemo } from "react"

import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { useBalanceLocks } from "./useBalanceLocks"

type DetailRow = {
  key: BalanceLockType
  title: string
  tokens: bigint
  fiat: number | null
  locked: boolean
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
  const { consolidatedLocks, isLoading, error } = useBalanceLocks({
    chainId: chainId as string,
    addresses: addressesWithLocks,
  })

  const detailRows: DetailRow[] = useMemo(() => {
    return summary
      ? ([
          {
            key: "available",
            title: "Available",
            tokens: summary.availableTokens,
            fiat: summary.availableFiat,
            locked: false,
          },
          ...consolidatedLocks.map(({ type, amount }) => ({
            key: type,
            title: getBalanceLockTypeTitle(type, consolidatedLocks),
            tokens: BigInt(amount),
            fiat: token?.rates
              ? new BalanceFormatter(amount, token?.decimals, token.rates).fiat("usd")
              : null,
            locked: true,
          })),
          error && {
            key: "frozen",
            title: "Frozen",
            tokens: summary.frozenTokens,
            fiat: summary.frozenFiat,
            locked: true,
          },
          {
            key: "reserved",
            title: "Reserved",
            tokens: summary.reservedTokens,
            fiat: summary.reservedFiat,
            locked: true,
          },
        ].filter((row) => row && row.tokens > 0) as DetailRow[])
      : []
  }, [consolidatedLocks, error, summary, token?.decimals, token?.rates])

  const { chain, evmNetwork } = balances.sorted[0]
  const networkType = useMemo(() => {
    if (evmNetwork) return evmNetwork.isTestnet ? "Testnet" : "EVM blockchain"

    if (chain) {
      if (chain.isTestnet) return "Testnet"
      return chain.paraId ? "Parachain" : "Relay chain"
    }

    return null
  }, [chain, evmNetwork])

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
