import { Balances } from "@core/types"
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

export const useTokenBalancesSummary = (balances: Balances) => {
  const { token, summary } = useMemo(() => {
    if (!balances.sorted.length) return {}

    const token = balances.sorted[0]?.token
    if (!token) return {}

    // summary makes sense only if the token is shared by all balances
    const isSharedSymbol = balances.sorted.every((b) => b.token?.symbol === token.symbol)
    if (!isSharedSymbol) {
      // eslint-disable-next-line no-console
      console.warn("useTokenBalancesSummary: balances are not shared by the same token", [
        ...new Set(balances.sorted.map((b) => b.token?.symbol)),
      ])
      return {}
    }

    // sum is only available for fiat, so we sum ourselves both tokens & fiat
    const summary = balances.sorted.reduce<BalanceSummary>(
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
        totalFiat: token?.rates ? totalFiat! + (b.total.fiat("usd") ?? 0) : null,
        lockedTokens: lockedTokens + b.frozen.planck + b.reserved.planck,
        lockedFiat: token?.rates
          ? lockedFiat! + (b.frozen.fiat("usd") ?? 0) + (b.reserved.fiat("usd") ?? 0)
          : null,
        reservedTokens: reservedTokens + b.reserved.planck,
        reservedFiat: token?.rates ? reservedFiat! + (b.reserved.fiat("usd") ?? 0) : null,
        frozenTokens: frozenTokens + b.frozen.planck,
        frozenFiat: token?.rates ? frozenFiat! + (b.frozen.fiat("usd") ?? 0) : null,
        availableTokens: availableTokens + b.transferable.planck,
        availableFiat: token?.rates ? availableFiat! + (b.transferable.fiat("usd") ?? 0) : null,
      }),
      {
        totalTokens: BigInt(0),
        totalFiat: token?.rates ? 0 : null,
        lockedTokens: BigInt(0),
        lockedFiat: token?.rates ? 0 : null,
        reservedTokens: BigInt(0),
        reservedFiat: token?.rates ? 0 : null,
        frozenTokens: BigInt(0),
        frozenFiat: token?.rates ? 0 : null,
        availableTokens: BigInt(0),
        availableFiat: token?.rates ? 0 : null,
      }
    )

    return { token, summary }
  }, [balances])

  return { token, summary }
}
