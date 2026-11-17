import { formatCurrency, formatCurrencyToParts } from "./formatCurrency"

const getPriceOptions = (price: number, compact: boolean): Intl.NumberFormatOptions => ({
  minimumSignificantDigits: 3,
  maximumSignificantDigits: compact ? (price < 1 ? 3 : 4) : undefined,
  roundingPriority: compact ? "auto" : "morePrecision",
  notation: compact ? "compact" : "standard",
})

export const formatPrice = (price: number, currency: string, compact: boolean) =>
  formatCurrency(price, currency, getPriceOptions(price, compact))

const MIN_COLLAPSED_ZEROS = 4

export type CompactPriceParts =
  | { kind: "plain"; text: string }
  | { kind: "collapsedZeros"; head: string; zeroCount: number; tail: string }

export const formatCompactPrice = (price: number, currency: string): CompactPriceParts => {
  const parts = formatCurrencyToParts(price, currency, getPriceOptions(price, true))
  const joinParts = (from: number, to?: number) =>
    parts
      .slice(from, to)
      .map((part) => part.value)
      .join("")

  const fractionIndex = parts.findIndex((part) => part.type === "fraction")
  const integer = parts.find((part) => part.type === "integer")?.value
  const match = /^(0+)([1-9]\d*?)0*$/.exec(parts[fractionIndex]?.value ?? "")

  if (integer !== "0" || !match || match[1].length < MIN_COLLAPSED_ZEROS)
    return { kind: "plain", text: joinParts(0) }

  return {
    kind: "collapsedZeros",
    head: joinParts(0, fractionIndex),
    zeroCount: match[1].length,
    tail: match[2] + joinParts(fractionIndex + 1),
  }
}
