import { isEqual } from "lodash"
import { BehaviorSubject, distinctUntilChanged, Observable, shareReplay } from "rxjs"

export type LoadableStatus = "loading" | "loaded" | "error"

export type Loadable<
  T,
  S extends LoadableStatus = "loading" | "loaded" | "error",
> = S extends "loading"
  ? { status: "loading"; data: T | undefined; error: undefined }
  : S extends "loaded"
    ? { status: "loaded"; data: T; error: undefined }
    : { status: "error"; data: undefined; error: unknown }

type GetLoadableProps<T> = {
  queryFn: () => Promise<T>
  defaultValue?: T
  refreshInterval?: number
}

export const getLoadable$ = <T>({
  queryFn,
  defaultValue,
  refreshInterval,
}: GetLoadableProps<T>): Observable<Loadable<T>> => {
  return new Observable<Loadable<T>>((subscriber) => {
    const loadable$ = new BehaviorSubject<Loadable<T>>({
      status: "loading",
      data: defaultValue,
      error: undefined,
    })

    // result subscription
    const sub = loadable$.pipe(distinctUntilChanged<Loadable<T>>(isEqual)).subscribe(subscriber)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let timeout: any = null

    // fetch result subscription
    const run = () => {
      queryFn()
        .then((data) => {
          loadable$.next({ status: "loaded", data, error: undefined })
        })
        .catch((error) => {
          loadable$.next({ status: "error", data: undefined, error })
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
  }).pipe(shareReplay({ refCount: true, bufferSize: 1 }))
}
