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
  num?: string | number | null,
  digits = 4,
  options: Partial<Intl.NumberFormatOptions> = {},
  locale = "en-US"
): string => {
  if (num === null || num === undefined) return ""

  const value = Number(num)

  // very small numbers should display "< 0.0001"
  const minDisplayVal = 1 / Math.pow(10, digits)
  if (value > 0 && value < minDisplayVal) return `< ${formatDecimals(minDisplayVal)}`

  // count digits
  const flooredValue = Math.floor(value)
  const intDigits = flooredValue === 0 ? 0 : flooredValue.toString().length

  // we never want to display a rounded up value
  // to prevent JS default rounding, we will remove/truncate insignificant digits ourselves before formatting
  let truncatedValue = value

  //remove insignificant fraction digits
  const excessFractionDigits = digits - intDigits > 0 ? digits - intDigits : 0
  truncatedValue =
    Math.floor(truncatedValue * Math.pow(10, excessFractionDigits)) /
    Math.pow(10, excessFractionDigits)

  //remove insignificant integer digits
  const excessIntegerDigits = intDigits - digits > 0 ? intDigits - digits : 0
  if (excessIntegerDigits > 0)
    truncatedValue =
      Math.floor(truncatedValue / Math.pow(10, excessIntegerDigits)) *
      Math.pow(10, excessIntegerDigits)

  // format
  return Intl.NumberFormat(locale, {
    //compact notation (K, M, B) if above 9999
    notation: truncatedValue > 9999 ? "compact" : "standard",
    maximumSignificantDigits: digits + (truncatedValue < 1 ? 1 : 0),
    ...options,
  }).format(truncatedValue)
}
