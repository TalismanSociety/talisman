import BigNumber from "bignumber.js"

const MIN_DIGITS = 4 // less truncates more than what compact formating is
export const MAX_DECIMALS_FORMAT = 12

/**
 * Custom decimal number formatting for Talisman
 * note that the NumberFormat().format() call is the ressource heavy part, it's not worth trying to optimize other parts
 * @param num input number
 * @param digits number of significant digits to display
 * @param locale locale used to format the number
 * @param options formatting options
 * @returns the formatted value
 */
export const formatDecimals = (
  num?: string | number | null | BigNumber,
  digits = MIN_DIGITS,
  options: Partial<Intl.NumberFormatOptions> = {},
  locale = "en-US"
): string => {
  if (num === null || num === undefined) return ""
  if (digits < MIN_DIGITS) digits = MIN_DIGITS

  const value = new BigNumber(num)
  // very small numbers should display "< 0.0001"
  const minDisplayVal = 1 / Math.pow(10, digits)

  if (value.gt(0) && value.lt(minDisplayVal)) return `< ${formatDecimals(minDisplayVal)}`

  // count digits
  const flooredValue = value.integerValue()
  const intDigits = flooredValue.isEqualTo(0) ? 0 : flooredValue.toString().length

  // we never want to display a rounded up value
  // to prevent JS default rounding, we will remove/truncate insignificant digits ourselves before formatting
  let truncatedValue = value
  //remove insignificant fraction digits
  const excessFractionDigitsPow10 = new BigNumber(10).pow(
    digits > intDigits ? digits - intDigits : 0
  )

  truncatedValue = truncatedValue
    .multipliedBy(excessFractionDigitsPow10)
    .integerValue()
    .dividedBy(excessFractionDigitsPow10)

  //remove insignificant integer digits
  const excessIntegerDigits = new BigNumber(intDigits > digits ? intDigits - digits : 0)
  const excessIntegerDigitsPow10 = new BigNumber(10).pow(excessIntegerDigits)
  if (excessIntegerDigits.gt(0))
    truncatedValue = truncatedValue
      .dividedBy(excessIntegerDigitsPow10)
      .integerValue()
      .multipliedBy(excessIntegerDigitsPow10)

  // format

  return Intl.NumberFormat(locale, {
    //compact notation (K, M, B) if above 9999
    notation: truncatedValue.gt(9999) ? "compact" : "standard",
    maximumSignificantDigits: digits + (truncatedValue.lt(1) ? 1 : 0),
    ...options,
  }).format(truncatedValue.toNumber())
}
