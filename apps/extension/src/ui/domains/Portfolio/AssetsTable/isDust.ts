import type { Balances } from "@talismn/balances"

const DUST_THRESHOLD_USD = 1

const isPriced = (balances: Balances) =>
  balances.each.some((b) => !!b.token?.coingeckoId) ||
  balances.each.every((b) => b.total.fiat("usd") !== null)

export const isDust = (balances: Balances) =>
  isPriced(balances) && balances.sum.fiat("usd").total < DUST_THRESHOLD_USD
