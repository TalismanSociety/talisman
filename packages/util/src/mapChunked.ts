import type { OperatorFunction } from "rxjs"
import { concatMap, Observable, switchMap } from "rxjs"

import { isAbortError } from "./isAbortError"
import { createTimeSlicer, type TimeSlicer } from "./timeSlicer"

export type ChunkedProjectContext = {
  /** thread the slicer through chunked helpers (mapWithYield etc.) so the budget spans them */
  slicer: TimeSlicer
  /** aborted when the work is cancelled (new upstream value or unsubscription) */
  signal: AbortSignal
}

const runChunkedProject = <T, R>(
  project: (value: T, ctx: ChunkedProjectContext, index: number) => Promise<R>,
  budgetMs: number | undefined,
  value: T,
  index: number
): Observable<R> =>
  new Observable<R>((subscriber) => {
    const controller = new AbortController()
    const slicer = createTimeSlicer({ budgetMs, signal: controller.signal })

    project(value, { slicer, signal: controller.signal }, index).then(
      (result) => {
        if (!controller.signal.aborted) subscriber.next(result)
        subscriber.complete()
      },
      (error) => {
        // cancellation is not an error: never emit late, never error the stream
        if (isAbortError(error)) subscriber.complete()
        else subscriber.error(error)
      }
    )

    return () => controller.abort()
  })

/**
 * `switchMap` for time-sliced (chunked) async work — latest-wins: a new upstream value or
 * an unsubscription aborts the in-flight `project` via `ctx.signal` / the shared slicer,
 * so cancelled work stops burning CPU at its next yield check point and its result is
 * never emitted.
 *
 * Non-abort errors thrown by `project` error the stream (same as a throwing sync `map`).
 *
 * Note: pipelines using this operator already emit asynchronously (macrotask), so adding
 * `observeOn(asyncScheduler)` downstream is redundant and only adds latency.
 */
export const switchMapChunked = <T, R>(
  project: (value: T, ctx: ChunkedProjectContext, index: number) => Promise<R>,
  options?: { budgetMs?: number }
): OperatorFunction<T, R> =>
  switchMap((value: T, index: number) =>
    runChunkedProject(project, options?.budgetMs, value, index)
  )

/**
 * `concatMap` variant of switchMapChunked — ordered: upstream values queue and are
 * processed one at a time; a new value does NOT cancel in-flight work (unsubscription
 * still aborts it).
 */
export const concatMapChunked = <T, R>(
  project: (value: T, ctx: ChunkedProjectContext, index: number) => Promise<R>,
  options?: { budgetMs?: number }
): OperatorFunction<T, R> =>
  concatMap((value: T, index: number) =>
    runChunkedProject(project, options?.budgetMs, value, index)
  )
