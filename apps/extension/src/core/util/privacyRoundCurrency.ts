import BigNumber from "bignumber.js"

/**
 * Rounds a currency value (e.g. tokens / USD) to provide user privacy.
 *
 * @example
 * 0.00001234   -> 0.00001
 * 0.0001234    -> 0.0001
 * 0.001234     -> 0.001
 * 0.01234      -> 0.01
 * 0.12345      -> 0.1
 * 1.12345      -> 1
 * 12.3456      -> 12
 * 123.456      -> 123
 * 1,234.56     -> 1,230
 * 1,789.56     -> 1,790
 * 12,345.67    -> 12,300
 * 123,456.78   -> 123,000
 * 1,234,567.89 -> 1,230,000
 */
export const privacyRoundCurrency = (amount: number) => {
  // For amounts at or below 1, round to 1 significant digit
  if (amount <= 1) return BigNumber(amount).precision(1).toString(10)

  // For amounts below 1,000, round to the nearest whole number
  if (amount < 1_000) return BigNumber(amount).toFixed(0)

  // For amounts at 1,000 and above, round to 3 significant digits
  return BigNumber(amount).precision(3).toString(10)
}
