// guess group separator and decimal separator from this number
const testNumber = 1000.1
const parts = new Intl.NumberFormat(undefined).formatToParts(testNumber)

export const fiatDecimalSeparator = parts.find((p) => p.type === "decimal")?.value ?? "."

export const fiatGroupSeparator = parts.find((p) => p.type === "group")?.value ?? ","

export const formatFiat = (amount = 0, currency = "usd") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amount)
