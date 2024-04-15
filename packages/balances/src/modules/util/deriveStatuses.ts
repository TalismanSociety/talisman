import { BalanceJson } from "../../types"

/**
 * Sets all balance statuses from `live-${string}` to either `live` or `cached`
 *
 * You should make sure that the input collection `balances` is mutable, because the statuses
 * will be changed in-place as a performance consideration.
 */
export const deriveStatuses = (
  validSubscriptionIds: Set<string>,
  balances: BalanceJson[]
): BalanceJson[] => {
  balances.forEach((balance) => {
    if (["live", "cache", "stale", "initializing"].includes(balance.status)) return balance

    if (validSubscriptionIds.size < 1) {
      balance.status = "cache"
      return balance
    }

    if (!validSubscriptionIds.has(balance.status.slice("live-".length))) {
      balance.status = "cache"
      return balance
    }

    balance.status = "live"
    return balance
  })
  return balances
}
