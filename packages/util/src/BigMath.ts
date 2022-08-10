/**
 * Javascript's `Math` library for `BigInt`.
 * Taken from https://stackoverflow.com/questions/51867270/is-there-a-library-similar-to-math-that-supports-javascript-bigint/64953280#64953280
 */
export const BigMath = {
  abs(x: bigint) {
    return x < BigInt("0") ? -x : x
  },
  sign(x: bigint) {
    if (x === BigInt("0")) return BigInt("0")
    return x < BigInt("0") ? BigInt("-1") : BigInt("1")
  },
  // TODO: Improve our babel/tsc config to let us use the `**` operator on bigint values.
  // Error thrown: Exponentiation cannot be performed on 'bigint' values unless the 'target' option is set to 'es2016' or later. ts(2791)
  // pow(base: bigint, exponent: bigint) {
  //   return base ** exponent
  // },
  min(value: bigint, ...values: bigint[]) {
    for (const v of values) if (v < value) value = v
    return value
  },
  max(value: bigint, ...values: bigint[]) {
    for (const v of values) if (v > value) value = v
    return value
  },
}
