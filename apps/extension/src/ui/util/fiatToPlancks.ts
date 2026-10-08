import { tokensToPlanck } from "@talismn/util"

export const fiatToPlancks = (fiat: string, price: number, decimals: number): bigint | null => {
  const tokens = Number(fiat) / price
  if (!fiat.trim() || !Number.isFinite(tokens) || tokens < 0) return null

  return BigInt(tokensToPlanck(tokens.toFixed(decimals), decimals))
}
