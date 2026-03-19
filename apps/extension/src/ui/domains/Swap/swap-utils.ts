import { planckToTokens } from "@talismn/util"

/**
 * Format a swap exchange rate as "1 fromSymbol = X toSymbol".
 * When `reversed` is true, displays as "1 toSymbol = X fromSymbol".
 * Returns undefined when the rate cannot be computed (e.g. zero output).
 */
export function formatSwapExchangeRate(params: {
  fromAmount: bigint
  fromDecimals: number
  fromSymbol: string
  toDecimals: number
  toSymbol: string
  outputAmountBN: bigint
  reversed?: boolean
}): string | undefined {
  const { fromAmount, fromDecimals, fromSymbol, toDecimals, toSymbol, outputAmountBN, reversed } =
    params
  const toNum = Number(planckToTokens(outputAmountBN.toString(), toDecimals) ?? "0")
  const fromNum = Number(planckToTokens(fromAmount.toString(), fromDecimals) ?? "1")
  if (!toNum || !fromNum) return undefined

  const [baseSymbol, quoteSymbol, rate] = reversed
    ? [toSymbol, fromSymbol, fromNum / toNum]
    : [fromSymbol, toSymbol, toNum / fromNum]

  return `1 ${baseSymbol} = ${Intl.NumberFormat(undefined, {
    style: "decimal",
    minimumSignificantDigits: 3,
    maximumSignificantDigits: rate < 1 ? 3 : 4,
    roundingPriority: "morePrecision",
    notation: "compact",
  }).format(rate)} ${quoteSymbol}`
}

/**
 * Parse a user-typed token amount string into a planck bigint value.
 * E.g. "1.5" with 18 decimals → 1500000000000000000n
 *
 * This is the inverse of `planckToTokens` from @talismn/util.
 */
export function parseUserInputToPlanck(input: string, decimals: number): bigint {
  const badCharacter = input.match(/[^0-9.]/)
  if (badCharacter) {
    throw new Error(`Invalid character at position ${(badCharacter.index ?? 0) + 1}`)
  }

  let whole: string
  let fractional: string

  if (input.search(/\./) === -1) {
    whole = input
    fractional = ""
  } else {
    const parts = input.split(".")
    switch (parts.length) {
      case 0:
      case 1:
        throw new Error("Fewer than two elements in split result. This must not happen here.")
      case 2:
        whole = parts[0]!
        fractional = (parts[1] ?? "").replace(/0+$/, "")
        break
      default:
        throw new Error("More than one separator found")
    }
  }

  if (fractional.length > decimals) {
    fractional = fractional.slice(0, decimals)
  }

  const quantity = `${whole}${fractional.padEnd(decimals, "0")}`
  return BigInt(quantity)
}

/**
 * Format a swap duration in seconds into a human-readable string.
 * E.g. 0 → "Instant", 45 → "45s", 90 → "1m 30s", 120 → "2m"
 */
export function formatSwapDuration(sec: number, instantLabel = "Instant"): string {
  if (sec < 60) return sec <= 0 ? instantLabel : `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function parseUserInputToPlanckOrUndefined(
  input: string,
  decimals: number
): bigint | undefined {
  try {
    return parseUserInputToPlanck(input, decimals)
  } catch {
    return undefined
  }
}
