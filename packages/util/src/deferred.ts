/**
 * In TypeScript, a deferred promise refers to a pattern that involves creating a promise that can be
 * resolved or rejected at a later point in time, typically by code outside of the current function scope.
 *
 * This pattern is often used when dealing with asynchronous operations that involve multiple steps or when
 * the result of an operation cannot be immediately determined.
 */
export function Deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
  isPending: () => boolean
  isResolved: () => boolean
  isRejected: () => boolean
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  let isPending = true
  let isResolved = false
  let isRejected = false

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = (value) => {
      isPending = false
      isResolved = true
      innerResolve(value)
    }
    reject = (reason) => {
      isPending = false
      isRejected = true
      innerReject(reason)
    }
  })

  return {
    promise,
    resolve,
    reject,
    isPending: () => isPending,
    isResolved: () => isResolved,
    isRejected: () => isRejected,
  }
}
