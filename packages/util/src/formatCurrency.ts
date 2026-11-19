const SYMBOLS_UNKNOWN_TO_INTL: Partial<Record<string, string>> = {
  btc: "₿",
  eth: "Ξ",
  tao: "τ",
}

const INTL_MAX_FRACTION_DIGITS = 20

type FormatCurrencyOptions = Omit<Intl.NumberFormatOptions, "style" | "currency">

const clampFractionDigits = (digits: number | undefined) =>
  digits === undefined ? undefined : Math.min(digits, INTL_MAX_FRACTION_DIGITS)

const isSpacing = (part: Intl.NumberFormatPart | undefined) =>
  part?.type === "literal" && part.value.trim() === ""

const withTrailingCode = (parts: Intl.NumberFormatPart[], code: string) => {
  const currencyIndex = parts.findIndex((part) => part.type === "currency")
  const number = parts
    .filter(
      (part, index) =>
        index !== currencyIndex && !(isSpacing(part) && Math.abs(index - currencyIndex) === 1)
    )
    .map((part) => part.value)
    .join("")
    .trim()

  return `${number} ${code}`
}

export const formatCurrency = (
  amount: number,
  currency: string,
  options: FormatCurrencyOptions = {}
) => {
  const currencyId = currency.toLowerCase()
  const currencyDisplay =
    options.currencyDisplay ?? (currencyId === "usd" ? "narrowSymbol" : "symbol")
  const intlOptions: Intl.NumberFormatOptions = {
    ...options,
    style: "currency",
    currency,
    currencyDisplay,
    minimumFractionDigits: clampFractionDigits(options.minimumFractionDigits),
    maximumFractionDigits: clampFractionDigits(options.maximumFractionDigits),
  }

  if (currencyDisplay === "code")
    return withTrailingCode(
      new Intl.NumberFormat(undefined, intlOptions).formatToParts(amount),
      currency.toUpperCase()
    )

  const symbol = currencyDisplay === "name" ? undefined : SYMBOLS_UNKNOWN_TO_INTL[currencyId]
  if (!symbol) return new Intl.NumberFormat(undefined, intlOptions).format(amount)

  const formatAsDollars = new Intl.NumberFormat(undefined, {
    ...intlOptions,
    currency: "USD",
    currencyDisplay: "narrowSymbol",
  })

  return formatAsDollars
    .formatToParts(amount)
    .map((part) => (part.type === "currency" ? symbol : part.value))
    .join("")
}
