import { tokensToPlanck } from "@talismn/util"

export const fiatToPlancks = (fiat: string, price: number, decimals: number): bigint | null => {
  const amount = Number(fiat)
  if (!fiat.trim() || !Number.isFinite(amount) || amount < 0 || !price) return null

  return BigInt(tokensToPlanck((amount / price).toFixed(decimals), decimals))
}
