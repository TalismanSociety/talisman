import { Balances } from "@core/domains/balances/types"
import { Chain } from "@core/domains/chains/types"
import { Token } from "@core/domains/tokens/types"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useMemo } from "react"

type BalanceSummary = {
  totalTokens: bigint
  totalFiat: number | null
  lockedTokens: bigint
  lockedFiat: number | null
  frozenTokens: bigint
  frozenFiat: number | null
  reservedTokens: bigint
  reservedFiat: number | null
  availableTokens: bigint
  availableFiat: number | null
}

const DEFAULT_SUMMARY: BalanceSummary = {
  totalTokens: BigInt(0),
  totalFiat: null,
  lockedTokens: BigInt(0),
  lockedFiat: null,
  frozenTokens: BigInt(0),
  frozenFiat: null,
  reservedTokens: BigInt(0),
  reservedFiat: null,
  availableTokens: BigInt(0),
  availableFiat: null,
}

const getBestTokenForSymbol = (symbol: string, tokens?: Token[], chains?: Chain[]) => {
  const matches = tokens?.filter((t) => t.symbol === symbol)

  return (
    // priority to token from a relay chain
    // mainnet relay native
    matches?.find(
      (t) =>
        !t.isTestnet && t.type === "native" && chains?.find((c) => !c.relay && c.id === t.chain?.id)
    ) ??
    // mainnet solo/para native
    matches?.find((t) => !t.isTestnet && t.type === "native") ??
    // mainnet which has an image
    matches?.find((t) => !t.isTestnet && (t as any).image) ??
    // testnet relay
    matches?.find(
      (t) =>
        t.isTestnet && t.type === "native" && chains?.find((c) => !c.relay && c.id === t.chain?.id)
    ) ??
    // testnet solo/para native
    matches?.find((t) => t.isTestnet && t.type === "native") ??
    // testnet which has an image
    matches?.find((t) => t.isTestnet && (t as any).image) ??
    // fallback
    matches?.[0]
  )
}

export const useTokenBalancesSummary = (balances: Balances, symbol: string) => {
  const { tokens, chains } = usePortfolio()
  // find the most appropriate token for this symbol (for the icon)
  const token = useMemo(
    () => getBestTokenForSymbol(symbol, tokens, chains),
    [chains, symbol, tokens]
  )

  const tokenBalances = useMemo(
    () => balances.sorted.filter((b) => b.token?.symbol === symbol),
    [balances, symbol]
  )

  const summary = useMemo(() => {
    if (!tokenBalances.length) return DEFAULT_SUMMARY

    const fiatDefaultValue = tokenBalances.some((b) => b.token?.rates) ? 0 : null

    // sum is only available for fiat, so we sum ourselves both tokens & fiat
    const summary = tokenBalances.reduce<BalanceSummary>(
      (
        {
          totalTokens,
          totalFiat,
          lockedTokens,
          lockedFiat,
          availableTokens,
          availableFiat,
          reservedTokens,
          reservedFiat,
          frozenTokens,
          frozenFiat,
        },
        b
      ) => ({
        totalTokens: totalTokens + b.total.planck,
        totalFiat: b.token?.rates ? (totalFiat ?? 0) + (b.total.fiat("usd") ?? 0) : totalFiat,
        lockedTokens: lockedTokens + b.frozen.planck + b.reserved.planck,
        lockedFiat: b.token?.rates
          ? (lockedFiat ?? 0) + (b.frozen.fiat("usd") ?? 0) + (b.reserved.fiat("usd") ?? 0)
          : lockedFiat,
        reservedTokens: reservedTokens + b.reserved.planck,
        reservedFiat: b.token?.rates
          ? (reservedFiat ?? 0) + (b.reserved.fiat("usd") ?? 0)
          : reservedFiat,
        frozenTokens: frozenTokens + b.frozen.planck,
        frozenFiat: b.token?.rates ? (frozenFiat ?? 0) + (b.frozen.fiat("usd") ?? 0) : frozenFiat,
        availableTokens: availableTokens + b.transferable.planck,
        availableFiat: b.token?.rates
          ? (availableFiat ?? 0) + (b.transferable.fiat("usd") ?? 0)
          : availableFiat,
      }),
      {
        totalTokens: BigInt(0),
        totalFiat: fiatDefaultValue,
        lockedTokens: BigInt(0),
        lockedFiat: fiatDefaultValue,
        reservedTokens: BigInt(0),
        reservedFiat: fiatDefaultValue,
        frozenTokens: BigInt(0),
        frozenFiat: fiatDefaultValue,
        availableTokens: BigInt(0),
        availableFiat: fiatDefaultValue,
      }
    )

    return summary
  }, [tokenBalances])

  return { token, summary, tokenBalances }
}
