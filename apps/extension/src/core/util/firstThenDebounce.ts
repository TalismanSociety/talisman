import { Observable, OperatorFunction, concat, debounceTime, skip, take } from "rxjs"

export const firstThenDebounce =
  <T>(timeout: number): OperatorFunction<T, T> =>
  (source: Observable<T>) =>
    concat(source.pipe(take(1)), source.pipe(skip(1)).pipe(debounceTime(timeout)))
