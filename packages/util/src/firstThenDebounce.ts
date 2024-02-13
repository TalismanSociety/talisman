import { Observable, OperatorFunction, concat, debounceTime, skip, take } from "rxjs"

/**
 * An rxjs operator which:
 *
 * 1. Emits the first value it receives from the source observable, then:
 * 2. Debounces any future values by `timeout` ms.
 */
export const firstThenDebounce =
  <T>(timeout: number): OperatorFunction<T, T> =>
  (source: Observable<T>) =>
    concat(source.pipe(take(1)), source.pipe(skip(1)).pipe(debounceTime(timeout)))
