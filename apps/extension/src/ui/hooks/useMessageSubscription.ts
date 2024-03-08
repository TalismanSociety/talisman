import { UnsubscribeFn } from "@extension/core"
import { DEBUG } from "@extension/shared"
import { isFunction } from "@polkadot/util"
import { useEffect, useState } from "react"
import { BehaviorSubject, map } from "rxjs"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Subscription = { subject: BehaviorSubject<any>; unsubscribe?: () => void }
type InitSubscriptionCallback<S> = (subject: BehaviorSubject<S>) => UnsubscribeFn
type MapSubjectToResult<S, R> = (subject: S) => R
const DEFAULT_TRANSFORM = <T, R>(value: T) => value as unknown as R

// global data store containing all subscriptions
const subscriptions: Record<string, Subscription> = {}

export const useMessageSubscription = <S, R = S>(
  key: string,
  initialSubjectValue: S,
  subscribe: InitSubscriptionCallback<S>,
  transform: MapSubjectToResult<S, R> = DEFAULT_TRANSFORM
): R => {
  // create the rxJS subject if it doesn't exist
  if (!subscriptions[key])
    subscriptions[key] = { subject: new BehaviorSubject<S>(initialSubjectValue) }

  //initialize state using subject's current value
  const [value, update] = useState(transform(subscriptions[key].subject.value))

  useEffect(() => {
    // subscribe to changes on our local observable to update our state
    const s = subscriptions[key].subject.pipe(map(transform)).subscribe(update)
    return () => {
      // unsubscribe from our local observable updates to prevent memory leaks
      s.unsubscribe()
      const { subject, unsubscribe } = subscriptions[key]
      if (!subject.observed && unsubscribe) {
        // eslint-disable-next-line no-console
        DEBUG && console.debug(`[frontend] unsubscribing ${key}`)

        // unsubscribe from backend updates to prevent unnecessary network connections
        unsubscribe()
        delete subscriptions[key].unsubscribe
      }
    }
  }, [key, transform])

  // Initialize subscription
  useEffect(() => {
    const { subject, unsubscribe } = subscriptions[key]
    // subscribe to backend store if not already done
    if (!unsubscribe) {
      const cb = subscribe(subject)

      // eslint-disable-next-line no-console
      DEBUG && console.debug(`[frontend] subscribing ${key}`)

      if (isFunction(cb)) subscriptions[key].unsubscribe = cb
      // this error should only happen when developping a new hook, let it bubble up
      else throw new Error(`${key} subscribe did not return an unsubscribe callback`)
    }
  }, [key, subscribe])

  return value
}
