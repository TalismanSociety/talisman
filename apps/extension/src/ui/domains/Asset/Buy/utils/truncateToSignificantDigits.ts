export const truncateToSignificantDigits = (input: number): number => {
  const str = input.toString()
  if (!str.includes(".")) return input

  const [integerPart, decimalPart] = str.split(".")

  const firstNonZeroIndex = decimalPart.split("").findIndex((digit) => digit !== "0")

  const truncatedDecimal = decimalPart.slice(0, firstNonZeroIndex + 2)

  return parseFloat(`${integerPart}.${truncatedDecimal}`)
}
