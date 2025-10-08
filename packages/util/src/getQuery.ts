import { isEqual } from "lodash-es"
import { BehaviorSubject, distinctUntilChanged, Observable, shareReplay } from "rxjs"

import { getSharedObservable } from "./getSharedObservable"

export type QueryStatus = "loading" | "loaded" | "error"

export type QueryResult<
  T,
  S extends QueryStatus = "loading" | "loaded" | "error",
> = S extends "loading"
  ? { status: "loading"; data: T | undefined; error: undefined }
  : S extends "loaded"
    ? { status: "loaded"; data: T; error: undefined }
    : { status: "error"; data: undefined; error: unknown }

type QueryOptions<Output, Args> = {
  namespace: string
  args: Args
  queryFn: (args: Args, signal: AbortSignal) => Promise<Output>
  defaultValue?: Output
  refreshInterval?: number
  serializer?: (args: Args) => string
}

/**
 * Creates a shared observable for executing queries with caching, loading states, and automatic refresh capabilities.
 *
 * @example
 * ```typescript
 * const userQuery$ = getQuery$({
 *   namespace: 'users',
 *   args: { userId: 123 },
 *   queryFn: async ({ userId }) => fetchUser(userId),
 *   defaultValue: null,
 *   refreshInterval: 30000
 * });
 *
 * userQuery$.subscribe(result => {
 *   if (result.status === 'loaded') {
 *     console.log(result.data);
 *   }
 * });
 * ```
 */
export const getQuery$ = <Output, Args>({
  namespace,
  args,
  queryFn,
  defaultValue,
  refreshInterval,
  serializer = (args) => JSON.stringify(args),
}: QueryOptions<Output, Args>): Observable<QueryResult<Output>> => {
  return getSharedObservable(
    namespace,
    args,
    () =>
      new Observable<QueryResult<Output>>((subscriber) => {
        const controller = new AbortController()

        const result = new BehaviorSubject<QueryResult<Output>>({
          status: "loading",
          data: defaultValue,
          error: undefined,
        })

        // result subscription
        const sub = result
          .pipe(distinctUntilChanged<QueryResult<Output>>(isEqual))
          .subscribe(subscriber)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let timeout: any = null

        // fetch result subscription
        const run = () => {
          if (controller.signal.aborted) return

          queryFn(args, controller.signal)
            .then((data) => {
              if (controller.signal.aborted) return
              result.next({ status: "loaded", data, error: undefined })
            })
            .catch((error) => {
              if (controller.signal.aborted) return
              result.next({ status: "error", data: undefined, error })
            })
            .finally(() => {
              if (controller.signal.aborted) return
              if (refreshInterval) timeout = setTimeout(run, refreshInterval)
            })
        }

        run()

        return () => {
          sub.unsubscribe()
          if (timeout) clearTimeout(timeout)
          controller.abort(new Error("getQuery$ unsubscribed"))
        }
      }).pipe(shareReplay({ refCount: true, bufferSize: 1 })),
    serializer,
  )
}
