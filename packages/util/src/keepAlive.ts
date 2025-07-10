import type { OperatorFunction } from "rxjs"
import { Observable, shareReplay, tap } from "rxjs"

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
export const keepAlive = <T>(timeout: number): OperatorFunction<T, T> => {
  let release: ReturnType<typeof keepSourceSubscribed> | null

  return (source: Observable<T>) =>
    source.pipe(
      tap({
        subscribe: () => {
          release = keepSourceSubscribed(source, timeout)
        },
        unsubscribe: () => {
          release?.()
        },
      }),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )
}

const keepSourceSubscribed = (observable: Observable<unknown>, ms: number) => {
  const sub = observable.subscribe()
  return () => setTimeout(() => sub.unsubscribe(), ms)
}
