import { Balance, Balances } from "@talismn/balances"
import { TokenRateCurrency } from "@talismn/token-rates"
import { formatDecimals } from "@talismn/util"
import { useMemo } from "react"

import { useSelectedCurrency } from "./useCurrency"

const formatBalanceDetails = (b: Balance, currency: TokenRateCurrency) =>
  `${formatDecimals(b.total.tokens)} ${b.token?.symbol ?? ""} / ${b.total
    .fiat(currency)
    ?.toLocaleString(undefined, { style: "currency", currency, currencyDisplay: "narrowSymbol" })}`

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
