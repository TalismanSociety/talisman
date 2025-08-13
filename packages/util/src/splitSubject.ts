import { Observable, Subject } from "rxjs"

/**
 * Takes a subject and splits it into two parts:
 *
 * 1. A function to submit new values into the subject.
 * 2. An observable for subscribing to new values from the subject.
 *
 * This can be helpful when, to avoid bugs, you want to expose only one
 * of these parts to external code and keep the other part private.
 */
export function splitSubject<T>(subject: Subject<T>) {
  const next = (value: T) => subject.next(value)
  const observable: Observable<T> = subject.asObservable()

  return [next, observable] as const
}
