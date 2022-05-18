export function Deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
  isPending: () => boolean
  isResolved: () => boolean
  isRejected: () => boolean
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: any) => void

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
