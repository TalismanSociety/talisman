export const formatPrice = (price: number, currency: string, compact: boolean) => {
  return Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: currency === "usd" ? "narrowSymbol" : "symbol",
    minimumSignificantDigits: 3,
    maximumSignificantDigits: compact ? (price < 1 ? 3 : 4) : undefined,
    roundingPriority: compact ? "auto" : "morePrecision",
    notation: compact ? "compact" : "standard",
  }).format(price)
}
