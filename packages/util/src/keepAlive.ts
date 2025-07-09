import type { MonoTypeOperatorFunction, Subscription } from "rxjs"
import { Observable } from "rxjs"

/**
 * An RxJS operator that keeps the source observable alive for a specified duration
 * after all subscribers have unsubscribed. This prevents expensive re-subscriptions
 * when subscribers come and go frequently.
 *
 * @param keepAliveMs - Duration in milliseconds to keep the source alive after last unsubscription
 * @returns MonoTypeOperatorFunction that can be used in pipe()
 *
 * @example
 * ```typescript
 * const data$ = expensive_api_call$.pipe(
 *   keepAlive(3000) // Keep alive for 3 seconds
 * );
 * ```
 */
export const keepAlive = <T>(keepAliveMs: number): MonoTypeOperatorFunction<T> => {
  return (source: Observable<T>) => {
    let refCount = 0
    let sourceSubscription: Subscription | null = null
    let cleanupTimer: NodeJS.Timeout | null = null
    let hasCompleted = false
    let hasErrored = false
    let error: unknown = null

    const cleanup = () => {
      if (sourceSubscription) {
        sourceSubscription.unsubscribe()
        sourceSubscription = null
      }
      cleanupTimer = null
      hasCompleted = false
      hasErrored = false
      error = null
    }

    return new Observable<T>((subscriber) => {
      // Cancel any pending cleanup
      if (cleanupTimer) {
        clearTimeout(cleanupTimer)
        cleanupTimer = null
      }

      refCount++

      // Handle already completed/errored states
      if (hasCompleted) {
        subscriber.complete()
        return () => {
          refCount--
        }
      }
      if (hasErrored) {
        subscriber.error(error)
        return () => {
          refCount--
        }
      }

      // Create source subscription if it doesn't exist
      if (!sourceSubscription) {
        sourceSubscription = source.subscribe({
          next: (value: T) => {
            subscriber.next(value)
          },
          error: (err: unknown) => {
            hasErrored = true
            error = err
            subscriber.error(err)
          },
          complete: () => {
            hasCompleted = true
            subscriber.complete()
          },
        })
      }

      return () => {
        refCount--

        if (refCount === 0) {
          cleanupTimer = setTimeout(cleanup, keepAliveMs)
        }
      }
    })
  }
}
