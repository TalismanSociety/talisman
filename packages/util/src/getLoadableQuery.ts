import { map, Observable, startWith } from "rxjs"

import { Loadable } from "./getLoadable"
import { getQuery$, QueryResult } from "./getQuery"

export type GetLoadableQueryParams<TArgs extends unknown[], TResult> = {
  namespace: string
  args: TArgs
  queryFn: (args: TArgs, signal: AbortSignal) => Promise<TResult>
  refreshInterval?: number
  defaultValue?: TResult
}

/**
 * Thin wrapper around getQuery$ that returns Loadable<T> and optionally
 * primes the stream with a loading state using the provided default value.
 *
 * TODO: consolidate with getQuery$
 */
export const getLoadableQuery$ = <TArgs extends unknown[], TResult>(
  params: GetLoadableQueryParams<TArgs, TResult>,
): Observable<Loadable<TResult>> => {
  const initial =
    params.defaultValue === undefined
      ? []
      : ([{ status: "loading", data: params.defaultValue }] as Loadable<TResult>[])

  return getQuery$(params).pipe(
    map((val: QueryResult<TResult>): Loadable<TResult> => {
      switch (val.status) {
        case "loading":
          return { status: "loading", data: val.data }
        case "loaded":
          return { status: "success", data: val.data }
        case "error": {
          const err = val.error as Error | undefined
          return {
            status: "error",
            error: {
              name: err?.name ?? "QueryError",
              message: err?.message ?? "Failed to execute query",
            },
          }
        }
      }
    }),
    startWith(...initial),
  )
}
