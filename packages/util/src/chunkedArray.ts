import { isEqual } from "lodash-es"

import { createTimeSlicer, type TimeSlicer } from "./timeSlicer"

export type ChunkedOptions = {
  /** max synchronous work per slice, in milliseconds (ignored when `slicer` is provided) */
  budgetMs?: number
  /** abort in-flight work; the returned promise rejects with an AbortError (ignored when `slicer` is provided) */
  signal?: AbortSignal
  /** share one slicer across multiple phases of work so the time budget spans them */
  slicer?: TimeSlicer
  /** identifies this work in host JS-activity reports (ignored when `slicer` is provided) */
  label?: string
}

const getSlicer = (options?: ChunkedOptions): TimeSlicer =>
  options?.slicer ??
  createTimeSlicer({ budgetMs: options?.budgetMs, signal: options?.signal, label: options?.label })

/**
 * `Array.prototype.forEach`, chunked: iterates synchronously until the time budget is
 * exhausted, then yields the thread to the host event loop before continuing.
 *
 * Errors thrown by `fn` reject the promise; aborting rejects with an AbortError at the
 * next between-items check point.
 */
export const forEachWithYield = async <T>(
  items: readonly T[],
  fn: (item: T, index: number) => void,
  options?: ChunkedOptions
): Promise<void> => {
  const slicer = getSlicer(options)
  for (let i = 0; i < items.length; i++) {
    const yielded = slicer.yieldIfNeeded()
    if (yielded) await yielded
    fn(items[i], i)
  }
  // final check point: without it, a loop whose LAST item blows the budget (including
  // the common single-item case, e.g. one storage query decoding a huge map) would
  // neither report over-budget work to the host watchdog nor honor a late abort
  const yielded = slicer.yieldIfNeeded()
  if (yielded) await yielded
}

/** `Array.prototype.map`, chunked (see forEachWithYield for semantics) */
export const mapWithYield = async <T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => R,
  options?: ChunkedOptions
): Promise<R[]> => {
  const results: R[] = new Array(items.length)
  await forEachWithYield(items, (item, i) => (results[i] = fn(item, i)), options)
  return results
}

/** lodash `keyBy`, chunked (see forEachWithYield for semantics) */
export const keyByWithYield = async <T>(
  items: readonly T[],
  keyFn: (item: T, index: number) => string,
  options?: ChunkedOptions
): Promise<Record<string, T>> => {
  const result: Record<string, T> = {}
  await forEachWithYield(items, (item, i) => (result[keyFn(item, i)] = item), options)
  return result
}

/**
 * Chunked equivalent of lodash `isEqual(a, b)` for arrays: `a === b` fast path, length
 * check, then per-item `a[i] === b[i] || isItemEqual(a[i], b[i])` within the time budget.
 * The result is identical to `isEqual(a, b)`.
 */
export const arrayItemsEqualWithYield = async <T>(
  a: readonly T[] | undefined,
  b: readonly T[] | undefined,
  options?: ChunkedOptions & { isItemEqual?: (x: T, y: T) => boolean }
): Promise<boolean> => {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false

  const isItemEqual = options?.isItemEqual ?? isEqual
  const slicer = getSlicer(options)
  for (let i = 0; i < a.length; i++) {
    const yielded = slicer.yieldIfNeeded()
    if (yielded) await yielded
    if (a[i] !== b[i] && !isItemEqual(a[i], b[i])) return false
  }
  return true
}
