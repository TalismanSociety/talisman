import { Balance, Balances } from "@talismn/balances"
import { TokenRateCurrency } from "@talismn/token-rates"
import { formatDecimals } from "@talismn/util"
import { useMemo } from "react"

import useSelectedCurrency from "./useSelectedCurrency"

const usdFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "usd",
  currencyDisplay: "code",
})
const formatUsd = (usd: number | null) => usdFormatter.format(usd ?? 0)
const formatBalanceDetails = (b: Balance, currency: TokenRateCurrency) =>
  `${formatDecimals(b.total.tokens)} ${b.token?.symbol ?? ""} / ${formatUsd(
    b.total.fiat(currency)
  )}`

export const useBalanceDetails = (balances: Balances) => {
  const currency = useSelectedCurrency()
  return useMemo(
    () => ({
      balanceDetails: balances
        .filterNonZeroFiat("total", currency)
        .sorted.map((x) => formatBalanceDetails(x, currency))
        .join("\n"),

      totalUsd: balances.sum.fiat(currency).total,
    }),
    [balances, currency]
  )
}
