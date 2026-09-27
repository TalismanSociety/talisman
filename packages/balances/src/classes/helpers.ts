import { BigMath } from "@talismn/util"
import type { Amount, ExtraAmount, IBalance, LockedAmount } from "../types/balancetypes"

import type { Balance } from "./Balance"
import type { FormattedAmount } from "./FormattedAmount"

export function excludeFromTransferableAmount(
  locks:
    | Amount
    | FormattedAmount<LockedAmount<string>, string>
    | Array<FormattedAmount<LockedAmount<string>, string>>
): bigint {
  if (typeof locks === "string") return BigInt(locks)
  if (!Array.isArray(locks)) locks = [locks]

  return locks
    .filter((lock) => lock.includeInTransferable !== true)
    .map((lock) => lock.amount.planck)
    .reduce((max, lock) => BigMath.max(max, lock), 0n)
}

export function excludeFromFeePayableLocks(
  locks: Amount | LockedAmount<string> | Array<LockedAmount<string>>
): Array<LockedAmount<string>> {
  if (typeof locks === "string") return []
  if (!Array.isArray(locks)) locks = [locks]

  return locks.filter((lock) => lock.excludeFromFeePayable)
}

export function includeInTotalExtraAmount(
  extra?:
    | FormattedAmount<ExtraAmount<string>, string>
    | Array<FormattedAmount<ExtraAmount<string>, string>>
): bigint {
  if (!extra) return 0n
  if (!Array.isArray(extra)) extra = [extra]

  return extra
    .filter((extra) => extra.includeInTotal)
    .map((extra) => extra.amount.planck)
    .reduce((a, b) => a + b, 0n)
}

/** A utility type used to extract the underlying `BalanceType` of a specific source from a generalised `BalanceJson` */
export const getBalanceId = (balance: Pick<IBalance, "address" | "tokenId">) => {
  const { address, tokenId } = balance
  return [address, tokenId].join("::")
}

/**
 * An individual balance.
 */
export const filterMirrorTokens = (balance: Balance, _i: number, balances: Balance[]) => {
  const mirrorOf = balance.token?.mirrorOf
  return !mirrorOf || !balances.find((b) => b.tokenId === mirrorOf)
}
