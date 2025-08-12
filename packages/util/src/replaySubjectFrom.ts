import { ReplaySubject } from "rxjs"

import { isPromise } from "./isPromise"

/**
 * Turns a value into a {@link ReplaySubject} of size 1.
 *
 * If the value is already a {@link ReplaySubject}, it will be returned as-is.
 *
 * If the value is a {@link Promise}, it will be awaited,
 * and the awaited value will be published into the {@link ReplaySubject} when it becomes available.
 *
 * For any other type of value, it will be immediately published into the {@link ReplaySubject}.
 */
export const replaySubjectFrom = <T>(
  initialValue: T | Promise<T> | ReplaySubject<T>,
): ReplaySubject<T> => {
  if (initialValue instanceof ReplaySubject) return initialValue

  const subject = new ReplaySubject<T>(1)

  // if initialValue is a promise, await it and then call `subject.next()` with the awaited value
  if (isPromise(initialValue)) {
    initialValue.then(
      (value) => subject.next(value),
      (error) => subject.error(error),
    )
    return subject
  }

  // if initialValue is not a promise, immediately call `subject.next()` with the value
  subject.next(initialValue)
  return subject
}
