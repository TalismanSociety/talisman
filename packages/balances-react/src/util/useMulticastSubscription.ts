import { useMemo } from "react"
import { Observable, defer, shareReplay } from "rxjs"

export type Unsubscribe = () => void

/**
 * Creates a subscription function that can be used to subscribe to a multicast observable created from an upstream source.
 *
 * An example of when this is useful is when we want to subscribe to some data from multiple components, but we only want
 * to actively keep that data hydrated when at least one component is subscribed to it.
 *
 * When the first component subscribes, the `upstream` function will be called. It should then set up a subscription and return a teardown function.
 * When subsequent components subscribe, they will be added to the existing subscription.
 * When the last component unsubscribes, the teardown function returned from the `upstream` function will be called.
 *
 * @param upstream A function that takes a "next" callback function as an argument, and returns either an unsubscribe function or void.
 * @returns A subscription function that can be used to subscribe to the multicast observable.
 */
export const useMulticastSubscription = <T>(
  upstream: (next: (val: T) => void) => Unsubscribe | void
) => {
  const subscribe = useMemo(() => createMulticastSubscription(upstream), [upstream])
  return subscribe
}

export const createMulticastSubscription = <T>(
  upstream: (next: (val: T) => void) => Unsubscribe | void
) => {
  // Create an upstream observable using the provided function.
  const upstreamObservable = new Observable<T>((subscriber): Unsubscribe => {
    const unsubscribe = upstream((val: T) => subscriber.next(val))
    return () => {
      typeof unsubscribe === "function" && unsubscribe()
    }
  })

  // Create a multicast observable from the upstream observable, using the shareReplay operator.
  const multicastObservable = defer(() => upstreamObservable).pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  )

  // Create a subscription function that subscribes to the multicast observable and returns an unsubscribe function.
  const subscribe = (callback?: (val: T) => void) => {
    const subscription = multicastObservable.subscribe(callback)
    const unsubscribe: Unsubscribe = () => subscription.unsubscribe()
    return unsubscribe
  }

  return subscribe
}
