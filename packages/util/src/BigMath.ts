/**
 * Javascript's `Math` library for `BigInt`.
 * Taken from https://stackoverflow.com/questions/51867270/is-there-a-library-similar-to-math-that-supports-javascript-bigint/64953280#64953280
 */
export const BigMath = {
  abs(x: bigint) {
    return x < 0n ? -x : x
  },
  sign(x: bigint) {
    if (x === 0n) return 0n
    return x < 0n ? -1n : 1n
  },
  min(value: bigint, ...values: bigint[]) {
    for (const v of values) if (v < value) value = v
    return value
  },
  max(value: bigint, ...values: bigint[]) {
    for (const v of values) if (v > value) value = v
    return value
  },
}
