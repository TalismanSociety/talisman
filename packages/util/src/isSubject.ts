import { Subject } from "rxjs"

/**
 * Tests to see if an object is an RxJS {@link Subject}.
 */
export function isSubject<T>(object?: Subject<T> | object): object is Subject<T> {
  if (!object) return false
  if (object instanceof Subject) return true
  return (
    "asObservable" in object &&
    isFn(object.asObservable) &&
    "complete" in object &&
    isFn(object.complete) &&
    "error" in object &&
    isFn(object.error) &&
    "forEach" in object &&
    isFn(object.forEach) &&
    "next" in object &&
    isFn(object.next) &&
    "pipe" in object &&
    isFn(object.pipe) &&
    "subscribe" in object &&
    isFn(object.subscribe) &&
    "unsubscribe" in object &&
    isFn(object.unsubscribe) &&
    "closed" in object &&
    isBool(object.closed) &&
    "observed" in object &&
    isBool(object.observed)
  )
}

/**
 * Returns `true` if `value` is a function.
 */
function isFn(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function"
}

/**
 * Returns `true` if `value` is a boolean.
 */
function isBool(value: unknown): value is boolean {
  return typeof value === "boolean"
}
