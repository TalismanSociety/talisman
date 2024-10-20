import { Observable, OperatorFunction, tap } from "rxjs"

/**
 * An rxjs operator which:
 *
 * 1. Emits the first value it receives from the source observable, then:
 * 2. Debounces any future values by `timeout` ms.
 */
export const tapDebug =
  <T>(label: string, outputData?: boolean): OperatorFunction<T, T> =>
  (source: Observable<T>) =>
    source.pipe(
      tap((data) => {
        const text = `[observable] ${label} emit`

        if (outputData) {
          // eslint-disable-next-line no-console
          console.debug(text, { data })
        } else {
          // eslint-disable-next-line no-console
          console.debug(text)
        }
      })
    )
