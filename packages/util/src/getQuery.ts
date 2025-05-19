import { isEqual } from "lodash"
import { BehaviorSubject, distinctUntilChanged, Observable, shareReplay } from "rxjs"

import { getCachedObservable$ } from "./getCachedObservable"

export type QueryStatus = "loading" | "loaded" | "error"

export type QueryResult<
  T,
  S extends QueryStatus = "loading" | "loaded" | "error",
> = S extends "loading"
  ? { status: "loading"; data: T | undefined; error: undefined }
  : S extends "loaded"
    ? { status: "loaded"; data: T; error: undefined }
    : { status: "error"; data: undefined; error: unknown }

type QueryOptions<T> = {
  queryKey: string
  queryFn: () => Promise<T>
  defaultValue?: T
  refreshInterval?: number
}

export const getQuery$ = <T>({
  queryKey,
  queryFn,
  defaultValue,
  refreshInterval,
}: QueryOptions<T>): Observable<QueryResult<T>> => {
  return getCachedObservable$(queryKey, () =>
    new Observable<QueryResult<T>>((subscriber) => {
      const result = new BehaviorSubject<QueryResult<T>>({
        status: "loading",
        data: defaultValue,
        error: undefined,
      })

      // result subscription
      const sub = result.pipe(distinctUntilChanged<QueryResult<T>>(isEqual)).subscribe(subscriber)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let timeout: any = null

      // fetch result subscription
      const run = () => {
        queryFn()
          .then((data) => {
            result.next({ status: "loaded", data, error: undefined })
          })
          .catch((error) => {
            result.next({ status: "error", data: undefined, error })
          })
          .finally(() => {
            if (refreshInterval) timeout = setTimeout(run, refreshInterval)
          })
      }

      run()

      return () => {
        sub.unsubscribe()
        if (timeout) clearTimeout(timeout)
      }
    }).pipe(shareReplay({ refCount: true, bufferSize: 1 })),
  )
}
