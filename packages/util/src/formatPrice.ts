import { formatCurrency } from "./formatCurrency"

export const formatPrice = (price: number, currency: string, compact: boolean) => {
  return formatCurrency(price, currency, {
    minimumSignificantDigits: 3,
    maximumSignificantDigits: compact ? (price < 1 ? 3 : 4) : undefined,
    roundingPriority: compact ? "auto" : "morePrecision",
    notation: compact ? "compact" : "standard",
  })
}
