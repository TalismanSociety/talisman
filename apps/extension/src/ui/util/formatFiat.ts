import type { TokenRateCurrency } from "@talismn/token-rates"
import { formatCurrency } from "@talismn/util"

// guess group separator and decimal separator from this number
const testNumber = 1000.1
const parts = new Intl.NumberFormat(undefined).formatToParts(testNumber)

export const fiatDecimalSeparator = parts.find((p) => p.type === "decimal")?.value ?? "."

export const fiatGroupSeparator = parts.find((p) => p.type === "group")?.value ?? ","

type FormatFiatProps = {
  currency: TokenRateCurrency
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"]
  minimumDecimalPlaces?: number
  compact?: boolean
}

export const formatFiat = (
  amount: number,
  { currency, currencyDisplay, minimumDecimalPlaces, compact }: FormatFiatProps
) => {
  const formatOptions: Intl.NumberFormatOptions = {
    currencyDisplay: currencyDisplay ?? (currency === "usd" ? "narrowSymbol" : "symbol"),
    notation: compact ? "compact" : "standard",

    ...(minimumDecimalPlaces !== undefined && {
      // NOTE: If minimumFractionDigits is set to an integer greater than `20` then it throws the error:
      //       `RangeError: minimumFractionDigits value is out of range`
      minimumFractionDigits: minimumDecimalPlaces <= 20 ? minimumDecimalPlaces : 20,
      // compact notation overrides maximumFractionDigits to 0-1 by default,
      // so we need to explicitly set it to show the desired decimal places
      ...(compact && {
        maximumFractionDigits: minimumDecimalPlaces <= 20 ? minimumDecimalPlaces : 20,
      }),
    }),
  }

  const formatted = formatCurrency(amount, currency, formatOptions)

  // Hack to get trailing ISO code instead of leading
  if (currencyDisplay === "code") {
    return `${formatted.replace(`${currency.toUpperCase()}`, "").trim()} ${currency.toUpperCase()}`
  }

  return formatted
}
