import { log } from "@core/log"
import { UnsubscribeFn } from "@core/types"
import { Atom, atom } from "jotai"
import { atomEffect } from "jotai-effect"
import { atomWithObservable } from "jotai/utils"
import { ReplaySubject } from "rxjs"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AtomSubscription<T = any> = (callback: (value: T) => void) => UnsubscribeFn
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SubscriptionData<T = any> = {
  subject: ReplaySubject<T>
  unsubscribe: UnsubscribeFn | null
  subscribed: boolean
  atomEffect: Atom<T>
  atomWithObservable: Atom<T | Promise<T>>
}

const SUBSCRIPTIONS = new WeakMap<AtomSubscription, SubscriptionData>()

const ensureSubscription = <T>(subscribe: AtomSubscription<T>, debugLabel?: string) => {
  if (!SUBSCRIPTIONS.has(subscribe)) {
    if (debugLabel) log.debug(`[${debugLabel}] - INITIALIZING`)

    const subject = new ReplaySubject<T>(1)

    SUBSCRIPTIONS.set(subscribe, {
      subject,
      atomWithObservable: atomWithObservable(() => subject),
      atomEffect: atomEffect(() => {
        ensureSubscription(subscribe, debugLabel ? `${debugLabel} - atomEffect` : undefined)
        return () => {
          // prevent immediate unsubscribe while navigating from one route to another
          setTimeout(() => {
            const sub = SUBSCRIPTIONS.get(subscribe)
            if (sub?.subscribed && sub.unsubscribe && !sub.subject.observed) {
              if (debugLabel) log.debug(`[${debugLabel}] - UNSUBSCRIBING`)
              sub.subscribed = false
              sub.unsubscribe()
              sub.unsubscribe = null
            }
          }, 100)
        }
      }),
      unsubscribe: null,
      subscribed: false,
    })
  }

  const subscription = SUBSCRIPTIONS.get(subscribe) as SubscriptionData<T>
  if (!subscription.subscribed) {
    if (debugLabel) log.debug(`[${debugLabel}] - SUBSCRIBING`)

    // can't just test unsubscribe to be null because some subscriptions (ex balanceTotals) update synchronously, it would cause an infinite render loop
    // => need a dedicated boolean to be set prior starting the subscription
    subscription.subscribed = true
    subscription.unsubscribe = subscribe((value) => {
      if (debugLabel) log.debug(`[${debugLabel}] - UPDATING`, { value })
      if (subscription.subscribed) subscription.subject.next(value)
    })
  }

  return subscription
}

export const atomWithSubscription = <T>(sub: AtomSubscription<T>, debugLabel?: string) =>
  atom((get) => {
    const subscription = ensureSubscription(sub, debugLabel)
    get(subscription.atomEffect)
    return get(subscription.atomWithObservable)
  })
