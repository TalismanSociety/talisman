import { Observable as DexieObservable } from "dexie"
import { Observable as RxjsObservable } from "rxjs"

/**
 * Converts a dexie Observable into an rxjs Observable.
 */
export function dexieToRxjs<T>(o: DexieObservable<T>): RxjsObservable<T> {
  return new RxjsObservable<T>((observer) => {
    const subscription = o.subscribe({
      next: (value) => observer.next(value),
      error: (error) => observer.error(error),
    })
    return () => subscription.unsubscribe()
  })
}
