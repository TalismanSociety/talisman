import { Balance, Balances } from "@talismn/balances"
import { formatDecimals } from "@talismn/util"
import { useMemo } from "react"

const asBalances = (balances: Balances | Balance[]): Balances =>
  balances instanceof Balances ? balances : new Balances(balances)

const usdFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "usd",
  currencyDisplay: "narrowSymbol",
})
const formatUsd = (usd: number | null) => usdFormatter.format(usd ?? 0)
const formatBalanceDetails = (b: Balance) =>
  `${formatDecimals(b.total.tokens)} ${b.token?.symbol ?? ""} / ${formatUsd(b.total.fiat("usd"))}`

export const useBalanceDetails = (balances: Balances | Balance[]) =>
  useMemo(
    () => ({
      balanceDetails: asBalances(balances)
        .filterNonZeroFiat("total", "usd")
        .sorted.map(formatBalanceDetails)
        .join("\n"),

      totalUsd: asBalances(balances).sum.fiat("usd").total,
    }),
    [balances]
  )
