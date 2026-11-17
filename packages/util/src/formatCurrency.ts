const SYMBOLS_UNKNOWN_TO_INTL: Partial<Record<string, string>> = {
  btc: "₿",
  eth: "Ξ",
  tao: "τ",
}

type FormatCurrencyOptions = Omit<Intl.NumberFormatOptions, "style" | "currency">

export const formatCurrency = (
  amount: number,
  currency: string,
  options: FormatCurrencyOptions = {}
) => {
  const symbol =
    options.currencyDisplay === "code" || options.currencyDisplay === "name"
      ? undefined
      : SYMBOLS_UNKNOWN_TO_INTL[currency.toLowerCase()]

  if (!symbol)
    return new Intl.NumberFormat(undefined, { ...options, style: "currency", currency }).format(
      amount
    )

  const formatAsDollars = new Intl.NumberFormat(undefined, {
    ...options,
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
  })

  return formatAsDollars
    .formatToParts(amount)
    .map((part) => (part.type === "currency" ? symbol : part.value))
    .join("")
}
