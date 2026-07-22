import type { MonoTypeOperatorFunction, Observable } from "rxjs"
import { defer, map } from "rxjs"

import type { IBalance } from "../../types"
import { getBalanceId } from "../../types"
import { getBalanceFingerprint } from "../../types/fingerprint"
import type { FetchBalanceResults } from "../../types/IBalanceModule"

/**
 * How a freshly fetched balance relates to the last EMITTED balance with the same id:
 * - "equal": no meaningful difference — keep emitting the previous object
 * - "drift": only continuously-moving values differ (e.g. an AMM price, an accruing
 *   dividend). Real, but not worth re-emitting on every poll — the stabilizer re-emits
 *   drift at most once per `driftRefreshMs`.
 * - "changed": a structural change (amounts, status, locks) — emit immediately
 */
export type BalanceEquivalence = "equal" | "drift" | "changed"

/**
 * Optional module-specific equivalence for drift-prone values (e.g. substrate-dtao's
 * per-block AMM price). Called with the last EMITTED balance and the freshly fetched one
 * for the same balance id. Boolean returns are supported for simple comparators
 * (true = "equal", false = fall back to the exact fingerprint compare).
 */
export type IsEffectivelyEqualBalance = (
  previous: IBalance,
  next: IBalance
) => boolean | BalanceEquivalence

export type BalanceStabilizerOptions = {
  /**
   * Minimum interval between emissions caused ONLY by "drift"-classified changes.
   * Bounds both staleness (a drifting value is never more than this out of date once
   * past the comparator's tolerance) and emission frequency (a fast-moving value can't
   * force a re-emission on every poll).
   */
  driftRefreshMs?: number
  /** injectable clock for tests; defaults to performance.now, falling back to Date.now */
  now?: () => number
}

const DEFAULT_DRIFT_REFRESH_MS = 30_000

const defaultNow: () => number =
  typeof performance !== "undefined" ? () => performance.now() : () => Date.now()

/**
 * Reuses the previous emission's IBalance object whenever the freshly fetched one is
 * equivalent, so that unchanged balances stay REFERENCE-STABLE across emissions.
 *
 * Why this matters: every fetch/decode allocates brand-new balance objects, and all
 * downstream change-detection (fingerprint WeakMaps, distinctUntilChanged item compares,
 * storage no-op detection, UI memoization) is keyed on object identity. With stable
 * references, a poll where one balance changed produces an array where the other N-1
 * items compare by `===` everywhere downstream.
 *
 * Equivalence checks, in order of cost:
 * 1. reference equality
 * 2. `isEffectivelyEqual` (when provided — cheap, targeted field compare; also lets
 *    modules classify sub-threshold or continuous movement as "equal"/"drift")
 * 3. fingerprint equality (WeakMap-cached JSON.stringify — exact)
 *
 * Because reuse is always judged against the last EMITTED object, tolerated drift
 * accumulates and re-emits once it crosses the module's threshold — and even then,
 * drift-only changes re-emit at most once per `driftRefreshMs`.
 */
export const createBalanceStabilizer = (
  isEffectivelyEqual?: IsEffectivelyEqualBalance,
  options?: BalanceStabilizerOptions
): ((balances: IBalance[]) => IBalance[]) => {
  const driftRefreshMs = options?.driftRefreshMs ?? DEFAULT_DRIFT_REFRESH_MS
  const now = options?.now ?? defaultNow

  type Entry = { balance: IBalance; emittedAt: number }
  let previousById = new Map<string, Entry>()

  const classify = (previous: IBalance, next: IBalance): BalanceEquivalence => {
    if (previous === next) return "equal"

    if (isEffectivelyEqual) {
      const result = isEffectivelyEqual(previous, next)
      if (result === true) return "equal"
      if (result !== false) return result
      // false → fall through to the exact fingerprint compare
    }

    return getBalanceFingerprint(previous) === getBalanceFingerprint(next) ? "equal" : "changed"
  }

  return (balances: IBalance[]): IBalance[] => {
    const nextById = new Map<string, Entry>()

    // pass 1: classify everything against the last emitted objects
    const classified = balances.map((balance) => {
      const id = getBalanceId(balance)
      const previousEntry = previousById.get(id)
      const equivalence: BalanceEquivalence = previousEntry
        ? classify(previousEntry.balance, balance)
        : "changed"
      return { id, balance, previousEntry, equivalence }
    })

    // batch-aligned drift release: when any drift window has expired, refresh EVERY
    // drift-classified balance in the same pass. Per-balance windows start at different
    // times, so without alignment many drifting positions dribble out as frequent small
    // emissions; with it they coalesce into one batched emission per refresh interval.
    //
    // Deliberately NOT triggered by "changed" balances: ids toggling in/out of the
    // result set classify as "changed" (no previous entry), and piggybacking on those
    // released the whole drift pool on nearly every poll — defeating the interval.
    const releaseDrift = classified.some(
      ({ previousEntry, equivalence }) =>
        equivalence === "drift" &&
        previousEntry !== undefined &&
        now() - previousEntry.emittedAt >= driftRefreshMs
    )

    // pass 2: reuse or release
    const stabilized = classified.map(({ id, balance, previousEntry, equivalence }): IBalance => {
      const reusePrevious =
        previousEntry !== undefined &&
        (equivalence === "equal" || (equivalence === "drift" && !releaseDrift))

      if (reusePrevious) {
        nextById.set(id, previousEntry)
        return previousEntry.balance
      }

      nextById.set(id, { balance, emittedAt: now() })
      return balance
    })

    // only ids present in the latest emission are kept, so removed balances don't leak
    previousById = nextById

    return stabilized
  }
}

/**
 * Default cross-module drift classifier: balances whose SHAPE is identical (same
 * address/token/status, same value set with same types/labels/metas) but whose amounts
 * moved by no more than `toleranceBps` classify as "drift" — continuously-moving
 * positions (LP shares, yield-bearing tokens, rebasing assets) otherwise re-emit on
 * every poll and defeat all downstream dedup. Anything structural, or any amount move
 * beyond the tolerance, classifies as "changed" and emits immediately.
 */
export const classifySmallAmountDrift =
  (toleranceBps: bigint): IsEffectivelyEqualBalance =>
  (previous: IBalance, next: IBalance): BalanceEquivalence => {
    if (previous.address !== next.address) return "changed"
    if (previous.tokenId !== next.tokenId) return "changed"
    if (previous.networkId !== next.networkId) return "changed"
    if (previous.source !== next.source) return "changed"
    if (previous.status !== next.status) return "changed"

    let drift = false

    const classifyAmount = (a: string | undefined, b: string | undefined): boolean => {
      if (a === b) return true
      let prevAmount: bigint
      let nextAmount: bigint
      try {
        prevAmount = BigInt(a ?? "0")
        nextAmount = BigInt(b ?? "0")
      } catch {
        return false
      }
      // zero → non-zero (and vice versa) is always a real transition
      if (prevAmount === 0n || nextAmount === 0n) return false
      const diff = prevAmount > nextAmount ? prevAmount - nextAmount : nextAmount - prevAmount
      const max = prevAmount > nextAmount ? prevAmount : nextAmount
      if (diff * 10_000n > max * toleranceBps) return false
      drift = true
      return true
    }

    // simple balances carry a single `value` amount
    const previousValue = "value" in previous ? previous.value : undefined
    const nextValue = "value" in next ? next.value : undefined
    if (!classifyAmount(previousValue, nextValue)) return "changed"

    const previousValues = ("values" in previous ? previous.values : undefined) ?? []
    const nextValues = ("values" in next ? next.values : undefined) ?? []
    if (previousValues.length !== nextValues.length) return "changed"

    for (let i = 0; i < previousValues.length; i++) {
      const prevEntry = previousValues[i]
      const nextEntry = nextValues[i]
      if (prevEntry.type !== nextEntry.type) return "changed"
      if (prevEntry.label !== nextEntry.label) return "changed"
      if (!classifyAmount(prevEntry.amount, nextEntry.amount)) return "changed"
      // metas and variant flags must match exactly (compared cheaply by JSON — only runs
      // for balances that already failed the fingerprint fast path)
      const { amount: _prevAmount, ...prevRest } = prevEntry
      const { amount: _nextAmount, ...nextRest } = nextEntry
      if (JSON.stringify(prevRest) !== JSON.stringify(nextRest)) return "changed"
    }

    return drift ? "drift" : "equal"
  }

/**
 * Operator form of createBalanceStabilizer for module result streams: stabilizes
 * `success` (errors/dynamicTokens pass through). One stabilizer per subscription.
 *
 * Place BEFORE `distinctUntilChanged(isEqualModuleResults)` so the gate's per-item
 * compares hit the `===` fast path (and, with `isEffectivelyEqual`, so tolerated drift
 * cannot hold the gate open).
 */
export const stabilizeModuleResults = (
  isEffectivelyEqual?: IsEffectivelyEqualBalance,
  options?: BalanceStabilizerOptions
): MonoTypeOperatorFunction<FetchBalanceResults> => {
  return (source: Observable<FetchBalanceResults>) =>
    defer(() => {
      const stabilize = createBalanceStabilizer(isEffectivelyEqual, options)
      return source.pipe(map((results) => ({ ...results, success: stabilize(results.success) })))
    })
}
