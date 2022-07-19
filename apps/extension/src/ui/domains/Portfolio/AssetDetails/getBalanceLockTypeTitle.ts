import { BalanceLockType, LockedBalance } from "@core/domains/balances/types"

export const getBalanceLockTypeTitle = (input: BalanceLockType, allLocks: LockedBalance[]) => {
  if (!input) return input
  if (input === "other")
    return allLocks.some(({ type }) => type !== "other") ? "Locked (other)" : "Locked"
  return input.charAt(0).toUpperCase() + input.slice(1)
}
