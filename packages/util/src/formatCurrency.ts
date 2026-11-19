const INTL_CURRENCY_OVERRIDES: Partial<
  Record<string, { symbol?: string; fractionDigits?: number }>
> = {
  btc: { symbol: "₿", fractionDigits: 6 },
  eth: { symbol: "Ξ", fractionDigits: 5 },
  tao: { symbol: "τ", fractionDigits: 4 },
  idr: { fractionDigits: 0 },
}

const INTL_MAX_FRACTION_DIGITS = 20

type FormatCurrencyOptions = Omit<Intl.NumberFormatOptions, "style" | "currency">

const clampFractionDigits = (digits: number | undefined) =>
  digits === undefined ? undefined : Math.min(digits, INTL_MAX_FRACTION_DIGITS)

const fractionDigitsByCurrency = new Map<string, number>()

export const getCurrencyFractionDigits = (currency: string) => {
  const currencyId = currency.toLowerCase()
  const cached = fractionDigitsByCurrency.get(currencyId)
  if (cached !== undefined) return cached

  const { maximumFractionDigits: intlFractionDigits = 2 } = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).resolvedOptions()
  const fractionDigits = INTL_CURRENCY_OVERRIDES[currencyId]?.fractionDigits ?? intlFractionDigits
  fractionDigitsByCurrency.set(currencyId, fractionDigits)
  return fractionDigits
}

const getDefaultFractionDigits = (currencyId: string, options: FormatCurrencyOptions) => {
  const callerSetDigits = [
    options.minimumFractionDigits,
    options.maximumFractionDigits,
    options.minimumSignificantDigits,
    options.maximumSignificantDigits,
  ].some((digits) => digits !== undefined)
  if (callerSetDigits || options.notation === "compact") return undefined

  return INTL_CURRENCY_OVERRIDES[currencyId]?.fractionDigits
}

const isSpacing = (part: Intl.NumberFormatPart | undefined) =>
  part?.type === "literal" && part.value.trim() === ""

const withTrailingCode = (
  parts: Intl.NumberFormatPart[],
  code: string
): Intl.NumberFormatPart[] => {
  const currencyIndex = parts.findIndex((part) => part.type === "currency")
  const number = parts.filter(
    (part, index) =>
      index !== currencyIndex && !(isSpacing(part) && Math.abs(index - currencyIndex) === 1)
  )
  while (isSpacing(number[0])) number.shift()
  while (isSpacing(number.at(-1))) number.pop()

  return [...number, { type: "literal", value: " " }, { type: "currency", value: code }]
}

export const formatCurrencyToParts = (
  amount: number,
  currency: string,
  options: FormatCurrencyOptions = {}
): Intl.NumberFormatPart[] => {
  const currencyId = currency.toLowerCase()
  const currencyDisplay =
    options.currencyDisplay ?? (currencyId === "usd" ? "narrowSymbol" : "symbol")
  const defaultFractionDigits = getDefaultFractionDigits(currencyId, options)
  const intlOptions: Intl.NumberFormatOptions = {
    ...options,
    style: "currency",
    currency,
    currencyDisplay,
    minimumFractionDigits: clampFractionDigits(
      options.minimumFractionDigits ?? defaultFractionDigits
    ),
    maximumFractionDigits: clampFractionDigits(
      options.maximumFractionDigits ?? defaultFractionDigits
    ),
  }

  if (currencyDisplay === "code")
    return withTrailingCode(
      new Intl.NumberFormat(undefined, intlOptions).formatToParts(amount),
      currency.toUpperCase()
    )

  const symbol =
    currencyDisplay === "name" ? undefined : INTL_CURRENCY_OVERRIDES[currencyId]?.symbol
  if (!symbol) return new Intl.NumberFormat(undefined, intlOptions).formatToParts(amount)

  const formatAsDollars = new Intl.NumberFormat(undefined, {
    ...intlOptions,
    currency: "USD",
    currencyDisplay: "narrowSymbol",
  })

  return formatAsDollars
    .formatToParts(amount)
    .map((part) => (part.type === "currency" ? { ...part, value: symbol } : part))
}

export const formatCurrency = (
  amount: number,
  currency: string,
  options: FormatCurrencyOptions = {}
) =>
  formatCurrencyToParts(amount, currency, options)
    .map((part) => part.value)
    .join("")
