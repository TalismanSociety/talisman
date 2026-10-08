import { alphaToTao, taoToAlpha } from "@talismn/balances"
import { planckToTokens } from "@talismn/util"
import { fiatToPlancks } from "@ui/util/fiatToPlancks"

export type FiatConversion = {
  fiatPrice: number
  decimals: number
  /** TAO value of one unit of the amount, scaled by ALPHA_PRICE_SCALE */
  taoPerUnit: bigint
}

export const fiatToAmount = (fiat: string, { fiatPrice, decimals, taoPerUnit }: FiatConversion) => {
  const taoPlancks = fiatToPlancks(fiat, fiatPrice, decimals)
  return taoPlancks === null ? null : taoToAlpha(taoPlancks, taoPerUnit)
}

export const amountToFiat = (
  amount: bigint,
  { fiatPrice, decimals, taoPerUnit }: FiatConversion
) => {
  const tao = Number(planckToTokens(alphaToTao(amount, taoPerUnit).toString(), decimals))
  return String(Number((tao * fiatPrice).toFixed(2)))
}
