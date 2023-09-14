import { Balance, Balances } from "@talismn/balances"
import { formatDecimals } from "@talismn/util"
import { useMemo } from "react"

const usdFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "usd",
  currencyDisplay: "narrowSymbol",
})
const formatUsd = (usd: number | null) => usdFormatter.format(usd ?? 0)
const formatBalanceDetails = (b: Balance) =>
  `${formatDecimals(b.total.tokens)} ${b.token?.symbol ?? ""} / ${formatUsd(b.total.fiat("usd"))}`

export const useBalanceDetails = (balances: Balances) =>
  useMemo(
    () => ({
      balanceDetails: balances
        .filterNonZeroFiat("total", "usd")
        .sorted.map(formatBalanceDetails)
        .join("\n"),

      totalUsd: balances.sum.fiat("usd").total,
    }),
    [balances]
  )
