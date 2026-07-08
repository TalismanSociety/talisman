import type { AmountWithLabel, IBalance } from "../../types/balancetypes"
import type { SubDTaoBalanceMeta } from "./types"

/**
 * Volatile subnet AMM pools drift ~0.5%/min in normal trading, so a tighter tolerance
 * re-emits (and re-renders) on nearly every 6s poll. 50 bps keeps the displayed fiat
 * value of alpha positions at most 0.5% stale between genuine updates.
 */
const PRICE_DRIFT_TOLERANCE_BPS = 50n
/** root dividends accrue continuously; the pending-claim display is informational */
const CLAIM_DRIFT_TOLERANCE_BPS = 100n

/**
 * dtao balances embed two values that drift on (nearly) every block even when the user's
 * position is untouched:
 * - `meta.scaledAlphaPrice`: the subnet AMM pool price (moves with every trade)
 * - "Pending root claim" amounts: root staking dividends accrue continuously
 *
 * Without a tolerance, every 6s poll re-emits the full result set, which defeats every
 * distinctUntilChanged stage downstream and forces the whole pipeline (aggregation,
 * storage persistence, UI re-render) to run even though nothing user-visible changed.
 *
 * This comparator treats two emissions of the same balance as equal when every field
 * matches exactly EXCEPT the drift-prone values above, which may differ by up to the
 * tolerances relative to the previously EMITTED value. Because comparison is always
 * against the last emitted balance (see stabilizeBalances), drift accumulates and a
 * sustained move still surfaces once it crosses the tolerance — downstream values are
 * never more stale than the tolerance.
 */

const isWithinDriftTolerance = (previous: string, next: string, toleranceBps: bigint): boolean => {
  if (previous === next) return true

  let a: bigint
  let b: bigint
  try {
    a = BigInt(previous)
    b = BigInt(next)
  } catch {
    return false
  }

  // zero → non-zero (and vice versa) is always a real transition
  if (a === 0n || b === 0n) return false

  const diff = a > b ? a - b : b - a
  const max = a > b ? a : b
  return diff * 10_000n <= max * toleranceBps
}

/** the only labels whose amounts accrue per block (see fetchBalances) */
const PENDING_ROOT_CLAIM_LABEL = "Pending root claim"

const isEffectivelyEqualValue = (
  previous: AmountWithLabel<string>,
  next: AmountWithLabel<string>
): boolean => {
  if (previous.type !== next.type) return false
  if (previous.label !== next.label) return false

  // variant flags must match exactly (LockedAmount / ExtraAmount)
  if (
    ("includeInTransferable" in previous ? previous.includeInTransferable : undefined) !==
    ("includeInTransferable" in next ? next.includeInTransferable : undefined)
  )
    return false
  if (
    ("includeInTotal" in previous ? previous.includeInTotal : undefined) !==
    ("includeInTotal" in next ? next.includeInTotal : undefined)
  )
    return false

  const previousMeta = previous.meta as SubDTaoBalanceMeta | undefined
  const nextMeta = next.meta as SubDTaoBalanceMeta | undefined

  // conviction-lock meta (hotkey, lockType) must match exactly
  const previousLock = previousMeta?.convictionLock
  const nextLock = nextMeta?.convictionLock
  if (
    previousLock?.type !== nextLock?.type ||
    previousLock?.hotkey !== nextLock?.hotkey ||
    previousLock?.lockType !== nextLock?.lockType
  )
    return false

  // AMM price may drift within tolerance
  if (
    !isWithinDriftTolerance(
      previousMeta?.scaledAlphaPrice ?? "0",
      nextMeta?.scaledAlphaPrice ?? "0",
      PRICE_DRIFT_TOLERANCE_BPS
    )
  )
    return false

  // pending root claim accrues per block — tolerate sub-threshold accrual;
  // all other amounts (stake, conviction locks) must match exactly
  if (previous.label === PENDING_ROOT_CLAIM_LABEL)
    return isWithinDriftTolerance(previous.amount, next.amount, CLAIM_DRIFT_TOLERANCE_BPS)
  return previous.amount === next.amount
}

export const isEffectivelyEqualDTaoBalance = (previous: IBalance, next: IBalance): boolean => {
  if (previous.address !== next.address) return false
  if (previous.tokenId !== next.tokenId) return false
  if (previous.networkId !== next.networkId) return false
  if (previous.source !== next.source) return false
  if (previous.status !== next.status) return false

  const previousValues = ("values" in previous ? previous.values : undefined) ?? []
  const nextValues = ("values" in next ? next.values : undefined) ?? []
  if (previousValues.length !== nextValues.length) return false

  // values order is deterministic for a given position (see fetchBalances): index compare is safe
  return previousValues.every((value, i) => isEffectivelyEqualValue(value, nextValues[i]))
}
