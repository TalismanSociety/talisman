import { assert } from "@polkadot/util"

import { getBalanceId, getValueId } from "../../../types"
import { SubNativeBalance } from "../types"

export { filterBaseLocks, getLockTitle } from "./balanceLockTypes"
export type { BalanceLockType } from "./balanceLockTypes"

/**
 * Function to merge two 'sub sources' of the same balance together, or
 * two instances of the same balance with different values.
 * @param balance1 SubNativeBalance
 * @param balance2 SubNativeBalance
 * @param source source that this merge is for (will discard previous values from that source)
 * @returns SubNativeBalance
 */
export const mergeBalances = (
  balance1: SubNativeBalance | undefined,
  balance2: SubNativeBalance,
  source: string,
) => {
  if (balance1 === undefined) return balance2
  assert(
    getBalanceId(balance1) === getBalanceId(balance2),
    "Balances with different IDs should not be merged",
  )
  // locks and freezes should completely replace the previous rather than merging together
  const existingValues = Object.fromEntries(
    balance1.values
      .filter((v) => !v.source || v.source !== source)
      .map((value) => [getValueId(value), value]),
  )
  const newValues = Object.fromEntries(balance2.values.map((value) => [getValueId(value), value]))
  const mergedValues = { ...existingValues, ...newValues }

  const merged = {
    ...balance1,
    status: balance2.status, // only the status field should actually be different apart from the values
    values: Object.values(mergedValues),
  }
  return merged
}
