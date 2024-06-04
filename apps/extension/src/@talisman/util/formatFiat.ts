// guess group separator and decimal separator from this number
const testNumber = 1000.1
const parts = new Intl.NumberFormat(undefined).formatToParts(testNumber)

export const fiatDecimalSeparator = parts.find((p) => p.type === "decimal")?.value ?? "."

export const fiatGroupSeparator = parts.find((p) => p.type === "group")?.value ?? ","

export const formatFiat = (
  amount = 0,
  currency: Intl.NumberFormatOptions["currency"] | undefined,
  currencyDisplay?: string,
  minimumDecimalPlaces?: number
) => {
  const formatOptions: Intl.NumberFormatOptions = {
    ...(currency !== undefined && {
      style: "currency",
      currency,
      currencyDisplay: currencyDisplay ?? (currency === "usd" ? "narrowSymbol" : "symbol"),
    }),

    ...(minimumDecimalPlaces !== undefined && {
      // NOTE: If minimumFractionDigits is set to an integer greater than `20` then it throws the error:
      //       `RangeError: minimumFractionDigits value is out of range`
      minimumFractionDigits: minimumDecimalPlaces <= 20 ? minimumDecimalPlaces : 20,
    }),
  }

  const formatted = new Intl.NumberFormat(undefined, formatOptions).format(amount)

  // Hack to get trailing ISO code instead of leading
  if (currency !== undefined && currencyDisplay === "code") {
    return formatted.replace(`${currency.toUpperCase()}`, "").trim() + " " + currency.toUpperCase()
  }

  return formatted
}
