import { interval, map, type Observable, startWith, switchMap, tap } from "rxjs"

export const createPollingTrigger$ = <T>(
  values$: Observable<T>,
  intervalMs: number,
  onValue?: (value: T) => void
): Observable<T> =>
  values$.pipe(
    tap((value) => onValue?.(value)),
    switchMap((value) =>
      interval(intervalMs).pipe(
        startWith(0),
        map(() => value)
      )
    )
  )
