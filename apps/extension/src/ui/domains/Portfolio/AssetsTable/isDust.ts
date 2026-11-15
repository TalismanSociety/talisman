import type { Balances } from "@talismn/balances"

const DUST_THRESHOLD_USD = 1

export const isDust = (balances: Balances) =>
  balances.each.flatMap((b) => b.token?.coingeckoId ?? []).length > 0 &&
  balances.sum.fiat("usd").total < DUST_THRESHOLD_USD
