import log from "../../log"
import type { AmountWithLabel, IBalance } from "../../types/balancetypes"
import type { BalanceEquivalence } from "../shared/stabilizeBalances"
import type { SubDTaoBalanceMeta } from "./types"

/** root dividends accrue continuously; the pending-claim display is informational */
const CLAIM_DRIFT_TOLERANCE_BPS = 100n
/**
 * subnet staking positions auto-compound: dividend injections land once per subnet tempo
 * (staggered across subnets, so with many positions SOME position bumps on nearly every
 * poll). Moves up to this size classify as drift (surfaced within the refresh interval);
 * anything larger (a real stake/unstake) emits immediately.
 */
const STAKE_DRIFT_TOLERANCE_BPS = 100n

/**
 * dtao balances embed values that drift on (nearly) every block even when the user's
 * position is untouched: "Pending root claim" amounts accrue continuously, staking
 * positions auto-compound, and conviction locks decay.
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

type Classified = { equivalence: BalanceEquivalence; reason?: string }

const changed = (reason: string): Classified => ({ equivalence: "changed", reason })

/** claims accrue and locks decay — their values may appear/disappear as amounts cross zero */
const isDriftProneValue = (value: AmountWithLabel<string>): boolean =>
  value.label === PENDING_ROOT_CLAIM_LABEL ||
  !!(value.meta as SubDTaoBalanceMeta | undefined)?.convictionLock

const classifyValue = (
  previous: AmountWithLabel<string>,
  next: AmountWithLabel<string>
): Classified => {
  // variant flags must match exactly (LockedAmount / ExtraAmount)
  if (
    ("includeInTransferable" in previous ? previous.includeInTransferable : undefined) !==
      ("includeInTransferable" in next ? next.includeInTransferable : undefined) ||
    ("includeInTotal" in previous ? previous.includeInTotal : undefined) !==
      ("includeInTotal" in next ? next.includeInTotal : undefined)
  )
    return changed("variant flags")

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
    return changed("conviction lock meta")

  // amounts: every dtao amount kind moves continuously in its own way
  let drift = false
  if (previous.amount !== next.amount) {
    if (previous.label === PENDING_ROOT_CLAIM_LABEL) {
      // dividends accrue per block: sub-tolerance accrual is not worth surfacing at all,
      // beyond-tolerance accrual is drift (bounded by the refresh interval)
      if (!isWithinDriftTolerance(previous.amount, next.amount, CLAIM_DRIFT_TOLERANCE_BPS))
        drift = true
    } else if (previousLock) {
      // decaying conviction locks shrink every block — always drift (a lock disappearing
      // entirely removes its value and is treated as a drift-prone toggle instead)
      drift = true
    } else {
      // stake: auto-compounding dividend injections are drift, real stake/unstake moves
      // emit immediately
      if (isWithinDriftTolerance(previous.amount, next.amount, STAKE_DRIFT_TOLERANCE_BPS))
        drift = true
      else return changed(`amount ${previous.amount}→${next.amount}`)
    }
  }

  return { equivalence: drift ? "drift" : "equal" }
}

const keyOf = (value: AmountWithLabel<string>) => `${value.type}|${value.label}`

const classifyBalance = (previous: IBalance, next: IBalance): Classified => {
  if (previous.address !== next.address) return changed("address")
  if (previous.tokenId !== next.tokenId) return changed("tokenId")
  if (previous.networkId !== next.networkId) return changed("networkId")
  if (previous.source !== next.source) return changed("source")
  if (previous.status !== next.status) return changed(`status ${previous.status}→${next.status}`)

  const previousValues = ("values" in previous ? previous.values : undefined) ?? []
  const nextValues = ("values" in next ? next.values : undefined) ?? []

  // match values by (type, label) key, NOT by index: value sets legitimately toggle —
  // a pending claim or conviction lock value appears/disappears as its amount crosses
  // zero. Toggles of drift-prone values classify as drift; anything else is structural.
  const previousByKey = new Map(previousValues.map((value) => [keyOf(value), value]))
  const nextByKey = new Map(nextValues.map((value) => [keyOf(value), value]))
  if (previousByKey.size !== previousValues.length || nextByKey.size !== nextValues.length)
    return changed("duplicate value keys")

  let drift = false

  for (const [key, previousValue] of previousByKey) {
    const nextValue = nextByKey.get(key)
    if (!nextValue) {
      if (!isDriftProneValue(previousValue)) return changed(`value removed: ${key}`)
      drift = true
      continue
    }
    const result = classifyValue(previousValue, nextValue)
    if (result.equivalence === "changed") return changed(`${key}: ${result.reason}`)
    if (result.equivalence === "drift") drift = true
  }

  for (const [key, nextValue] of nextByKey) {
    if (previousByKey.has(key)) continue
    if (!isDriftProneValue(nextValue)) return changed(`value added: ${key}`)
    drift = true
  }

  return { equivalence: drift ? "drift" : "equal" }
}

export const isEffectivelyEqualDTaoBalance = (
  previous: IBalance,
  next: IBalance
): BalanceEquivalence => {
  const result = classifyBalance(previous, next)

  // "changed" forces an immediate full-pipeline emission — log WHY, so recurring
  // emissions can be attributed to a specific field instead of guessed at
  if (result.equivalence === "changed")
    log.debug(`[dtao-classify] changed ${next.tokenId}: ${result.reason}`)

  return result.equivalence
}
