import BigNumber from "bignumber.js"

export const fiatToPlancks = (fiat: string, price: number, decimals: number): bigint | null => {
  const plancks = BigNumber(fiat.trim())
    .shiftedBy(decimals)
    .div(price)
    .integerValue(BigNumber.ROUND_HALF_UP)
  if (!plancks.isFinite() || plancks.isNegative()) return null

  return BigInt(plancks.toFixed())
}
