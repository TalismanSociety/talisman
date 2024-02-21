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
  atomEffect: Atom<T>
  atomWithObservable: Atom<T | Promise<T>>
}

const SUBSCRIPTIONS = new WeakMap<AtomSubscription, SubscriptionData>()

const ensureSubscription = <T>(sub: AtomSubscription<T>, debugLabel?: string) => {
  if (!SUBSCRIPTIONS.has(sub)) {
    if (debugLabel) log.debug(`[${debugLabel}] - INITIALIZING`)

    const subject = new ReplaySubject<T>(1)

    SUBSCRIPTIONS.set(sub, {
      subject,
      atomWithObservable: atomWithObservable(() => subject),
      atomEffect: atomEffect(() => {
        ensureSubscription(sub, debugLabel)
        return () => {
          const subscription = SUBSCRIPTIONS.get(sub)
          if (subscription?.unsubscribe) {
            if (debugLabel) log.debug(`[${debugLabel}] - UNSUBSCRIBING`)
            subscription.unsubscribe()
            subscription.unsubscribe = null
          }
        }
      }),
      unsubscribe: null,
    })
  }

  const subscription = SUBSCRIPTIONS.get(sub) as SubscriptionData<T>
  if (!subscription.unsubscribe) {
    if (debugLabel) log.debug(`[${debugLabel}] - SUBSCRIBING`)
    subscription.unsubscribe = sub((value) => {
      log.debug(`[${debugLabel}] - UPDATING`, { value })
      subscription.subject.next(value)
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
