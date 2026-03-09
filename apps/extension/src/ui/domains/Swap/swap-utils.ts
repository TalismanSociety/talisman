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
        if (!parts[1]) throw new Error("Fractional part missing")
        whole = parts[0]!
        fractional = parts[1].replace(/0+$/, "")
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
