import { isFunction } from "@polkadot/util"
import { useEffect } from "react"
import { Subject } from "rxjs"

import log from "../log"

type UnsubscribeFn = () => void
type Subscription = { subject: Subject<unknown>; unsubscribe?: UnsubscribeFn }
type InitSubscriptionCallback = () => UnsubscribeFn

// global data store containing all subscriptions
const subscriptions: Record<string, Subscription> = {}

/**
 * This hook ensures a subscription is created only once, and unsubscribe automatically as soon as there is no consumer to the hook
 * @param key key that is unique to the subscription's parameters
 * @param subscribe // subscribe function that will be shared by all consumers of the key
 */
export const useSharedSubscription = (key: string, subscribe: InitSubscriptionCallback) => {
  // create the rxJS subject if it doesn't exist
  if (!subscriptions[key]) subscriptions[key] = { subject: new Subject() }

  useEffect(() => {
    // subscribe to subject.
    // it won't change but we need to count subscribers, to unsubscribe main subscription when no more observers
    const s = subscriptions[key].subject.subscribe()
    return () => {
      // unsubscribe from our local observable updates to prevent memory leaks
      s.unsubscribe()
      const { subject, unsubscribe } = subscriptions[key]
      if (!subject.observed && unsubscribe) {
        log.debug(`[useSharedSubscription] unsubscribing ${key}`)

        // unsubscribe from backend updates to prevent unnecessary network connections
        unsubscribe()
        delete subscriptions[key].unsubscribe
      }
    }
  }, [key])

  // Initialize subscription
  useEffect(() => {
    const { unsubscribe } = subscriptions[key]
    // launch the subscription if it's a new key
    if (!unsubscribe) {
      const cb = subscribe()

      log.debug(`[useSharedSubscription] subscribing ${key}`)

      if (isFunction(cb)) subscriptions[key].unsubscribe = cb
      // this error should only happen when developping a new hook, let it bubble up
      else throw new Error(`${key} subscribe did not return an unsubscribe callback`)
    }
  }, [key, subscribe])
}
