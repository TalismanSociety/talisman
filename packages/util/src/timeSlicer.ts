import { reportJsActivity } from "./jsActivityHook"
import { yieldToEventLoop } from "./yieldToEventLoop"

/**
 * Default CPU budget for a single synchronous slice of chunked work.
 * ~50-60% of a 60fps frame, leaving the rest for the host (user interactions, rendering).
 */
export const DEFAULT_TIME_SLICE_BUDGET_MS = 10

export type TimeSlicerOptions = {
  /** max synchronous work per slice, in milliseconds (default: DEFAULT_TIME_SLICE_BUDGET_MS) */
  budgetMs?: number
  /** aborting this signal makes the slicer throw an AbortError at its next check point */
  signal?: AbortSignal
  /** injectable clock for tests; defaults to performance.now, falling back to Date.now */
  now?: () => number
  /** identifies this slicer in host JS-activity reports (see jsActivityHook) */
  label?: string
}

export type TimeSlicer = {
  readonly signal?: AbortSignal
  /** true when the current slice has consumed its budget */
  shouldYield(): boolean
  /** unconditionally macrotask-yield, reset the slice, then throw if aborted */
  yield(): Promise<void>
  /**
   * Call between work items. Returns `undefined` (no promise, no microtask) while within
   * budget, so hot loops stay cheap:
   *
   * ```ts
   * const yielded = slicer.yieldIfNeeded()
   * if (yielded) await yielded
   * ```
   *
   * Throws synchronously if the signal is aborted.
   */
  yieldIfNeeded(): Promise<void> | undefined
  /** throws an Error with name "AbortError" (recognized by isAbortError) if the signal is aborted */
  throwIfAborted(): void
}

/**
 * Creates an AbortError-style error without relying on DOMException (not available on Hermes).
 * Recognized by `isAbortError` from this package.
 */
export const newAbortError = (): Error =>
  Object.assign(new Error("Aborted"), { name: "AbortError" })

const defaultNow: () => number =
  typeof performance !== "undefined" ? () => performance.now() : () => Date.now()

/**
 * Tracks a time budget for cooperative scheduling: run synchronous work until the budget
 * for the current slice is exhausted, then yield the thread back to the host event loop
 * before continuing.
 *
 * A single slicer can be shared across multiple phases of work so the budget spans them.
 */
export const createTimeSlicer = ({
  budgetMs = DEFAULT_TIME_SLICE_BUDGET_MS,
  signal,
  now = defaultNow,
  label,
}: TimeSlicerOptions = {}): TimeSlicer => {
  let sliceStart = now()

  const throwIfAborted = () => {
    if (signal?.aborted) throw newAbortError()
  }

  const shouldYield = () => now() - sliceStart >= budgetMs

  const doYield = async () => {
    // a slice that ran way past its budget means a SINGLE work item blocked the thread
    // (yield checks only happen between items) — report it so host stall watchdogs can
    // attribute the block to this pipeline instead of showing an anonymous stall
    const elapsed = now() - sliceStart
    if (elapsed >= budgetMs * 3)
      reportJsActivity(`timeSlicer over-budget slice${label ? ` (${label})` : ""}`, elapsed)

    await yieldToEventLoop()
    sliceStart = now()
    throwIfAborted()
  }

  return {
    signal,
    shouldYield,
    yield: doYield,
    yieldIfNeeded: () => {
      throwIfAborted()
      return shouldYield() ? doYield() : undefined
    },
    throwIfAborted,
  }
}
