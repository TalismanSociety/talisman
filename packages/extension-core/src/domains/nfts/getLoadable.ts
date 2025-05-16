import { isEqual } from "lodash"
import { BehaviorSubject, distinctUntilChanged, Observable, shareReplay } from "rxjs"

export type LoadableStatus = "loading" | "loaded" | "stale"

export type Loadable<
  T,
  S extends LoadableStatus = "loading" | "loaded" | "stale",
> = S extends "loading"
  ? { status: "loading"; data: T | undefined; error: undefined }
  : S extends "loaded"
    ? { status: "loaded"; data: T; error: undefined }
    : { status: "stale"; data: undefined; error: unknown }

export const getLoadable$ = <T>(
  asyncFn: () => Promise<T>,
  defaultValue?: T,
  refreshInterval?: number,
  // TODO implement abort signal
): Observable<Loadable<T>> => {
  return new Observable<Loadable<T>>((subscriber) => {
    const loadable$ = new BehaviorSubject<Loadable<T>>({
      status: "loading",
      data: defaultValue,
      error: undefined,
    })

    // result subscription
    const sub = loadable$.pipe(distinctUntilChanged<Loadable<T>>(isEqual)).subscribe((loadable) => {
      subscriber.next(loadable)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let timeout: any = null

    // fetch result subscription
    const run = () => {
      asyncFn()
        .then((data) => {
          loadable$.next({ status: "loaded", data, error: undefined })
        })
        .catch((error) => {
          loadable$.next({ status: "stale", data: undefined, error })
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
