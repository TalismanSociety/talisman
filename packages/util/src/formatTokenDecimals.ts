export const formatTokenDecimals = (amount: number | string, decimals: number): number => {
  const divisor = Math.pow(10, decimals)
  return Number(amount) / divisor
}
