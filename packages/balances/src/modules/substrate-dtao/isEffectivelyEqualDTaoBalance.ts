import type { AmountWithLabel, IBalance } from "../../types/balancetypes"
import type { BalanceEquivalence } from "../shared/stabilizeBalances"
import type { SubDTaoBalanceMeta } from "./types"

/**
 * Volatile subnet AMM pools drift ~0.5%/min in normal trading, so a tighter tolerance
 * re-emits (and re-renders) on nearly every 6s poll. 50 bps keeps the displayed fiat
 * value of alpha positions at most 0.5% stale between refreshes.
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
 * Without special handling, every 6s poll re-emits the full result set, which defeats
 * every distinctUntilChanged stage downstream and forces the whole pipeline
 * (aggregation, storage persistence, UI re-render) to run even though nothing
 * user-visible changed.
 *
 * This comparator classifies two emissions of the same balance (see BalanceEquivalence):
 * - "equal" when everything matches exactly except sub-tolerance movement of the
 *   drift-prone values above (relative to the previously EMITTED value, so movement
 *   accumulates and a sustained move still surfaces)
 * - "drift" when ONLY the drift-prone values moved, beyond tolerance. The stabilizer
 *   re-emits these at most once per refresh interval — important for fast-accruing
 *   values (a young pending claim can grow >1% per poll indefinitely, so a purely
 *   relative tolerance can never suppress it)
 * - "changed" for structural changes (stake, locks, status, value set) — emitted
 *   immediately
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

const classifyValue = (
  previous: AmountWithLabel<string>,
  next: AmountWithLabel<string>
): BalanceEquivalence => {
  if (previous.type !== next.type) return "changed"
  if (previous.label !== next.label) return "changed"

  // variant flags must match exactly (LockedAmount / ExtraAmount)
  if (
    ("includeInTransferable" in previous ? previous.includeInTransferable : undefined) !==
    ("includeInTransferable" in next ? next.includeInTransferable : undefined)
  )
    return "changed"
  if (
    ("includeInTotal" in previous ? previous.includeInTotal : undefined) !==
    ("includeInTotal" in next ? next.includeInTotal : undefined)
  )
    return "changed"

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
    return "changed"

  // pending root claim accrues per block; all other amounts (stake, conviction locks)
  // must match exactly
  const amountsEqual =
    previous.label === PENDING_ROOT_CLAIM_LABEL
      ? isWithinDriftTolerance(previous.amount, next.amount, CLAIM_DRIFT_TOLERANCE_BPS)
      : previous.amount === next.amount
  if (!amountsEqual) return previous.label === PENDING_ROOT_CLAIM_LABEL ? "drift" : "changed"

  // AMM price may drift
  if (
    !isWithinDriftTolerance(
      previousMeta?.scaledAlphaPrice ?? "0",
      nextMeta?.scaledAlphaPrice ?? "0",
      PRICE_DRIFT_TOLERANCE_BPS
    )
  )
    return "drift"

  return "equal"
}

export const isEffectivelyEqualDTaoBalance = (
  previous: IBalance,
  next: IBalance
): BalanceEquivalence => {
  if (previous.address !== next.address) return "changed"
  if (previous.tokenId !== next.tokenId) return "changed"
  if (previous.networkId !== next.networkId) return "changed"
  if (previous.source !== next.source) return "changed"
  if (previous.status !== next.status) return "changed"

  const previousValues = ("values" in previous ? previous.values : undefined) ?? []
  const nextValues = ("values" in next ? next.values : undefined) ?? []
  if (previousValues.length !== nextValues.length) return "changed"

  // values order is deterministic for a given position (see fetchBalances): index compare is safe
  let drift = false
  for (let i = 0; i < previousValues.length; i++) {
    const equivalence = classifyValue(previousValues[i], nextValues[i])
    if (equivalence === "changed") return "changed"
    if (equivalence === "drift") drift = true
  }
  return drift ? "drift" : "equal"
}
