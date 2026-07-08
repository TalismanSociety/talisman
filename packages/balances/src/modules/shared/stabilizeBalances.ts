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

    const stabilized = balances.map((balance): IBalance => {
      const id = getBalanceId(balance)
      const previousEntry = previousById.get(id)

      if (previousEntry) {
        const equivalence = classify(previousEntry.balance, balance)
        const reusePrevious =
          equivalence === "equal" ||
          (equivalence === "drift" && now() - previousEntry.emittedAt < driftRefreshMs)

        if (reusePrevious) {
          nextById.set(id, previousEntry)
          return previousEntry.balance
        }
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
