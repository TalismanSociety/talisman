import type { MonoTypeOperatorFunction, Observable } from "rxjs"
import { defer, map } from "rxjs"

import type { IBalance } from "../../types"
import type { FetchBalanceResults } from "../../types/IBalanceModule"
import { getBalanceId } from "../../types"
import { getBalanceFingerprint } from "../../types/fingerprint"

/**
 * Optional module-specific equivalence for drift-prone values (e.g. substrate-dtao's
 * per-block AMM price). Called with the last EMITTED balance and the freshly fetched one
 * for the same balance id — return true to keep emitting the previous object.
 */
export type IsEffectivelyEqualBalance = (previous: IBalance, next: IBalance) => boolean

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
 *    modules tolerate sub-threshold drift in values that move every block)
 * 3. fingerprint equality (WeakMap-cached JSON.stringify — exact)
 *
 * Because reuse is always judged against the last EMITTED object, tolerated drift
 * accumulates and re-emits once it crosses the module's threshold — values can never
 * drift arbitrarily far from what downstream last saw.
 */
export const createBalanceStabilizer = (
  isEffectivelyEqual?: IsEffectivelyEqualBalance
): ((balances: IBalance[]) => IBalance[]) => {
  let previousById = new Map<string, IBalance>()

  return (balances: IBalance[]): IBalance[] => {
    const nextById = new Map<string, IBalance>()

    const stabilized = balances.map((balance): IBalance => {
      const previous = previousById.get(getBalanceId(balance))

      const reusePrevious =
        previous !== undefined &&
        (previous === balance ||
          (isEffectivelyEqual !== undefined && isEffectivelyEqual(previous, balance)) ||
          getBalanceFingerprint(previous) === getBalanceFingerprint(balance))

      const result = reusePrevious ? previous : balance
      nextById.set(getBalanceId(result), result)
      return result
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
  isEffectivelyEqual?: IsEffectivelyEqualBalance
): MonoTypeOperatorFunction<FetchBalanceResults> => {
  return (source: Observable<FetchBalanceResults>) =>
    defer(() => {
      const stabilize = createBalanceStabilizer(isEffectivelyEqual)
      return source.pipe(map((results) => ({ ...results, success: stabilize(results.success) })))
    })
}
