import { UnsubscribeFn } from "@extension/core"
import { log } from "extension-shared"
import { Atom, atom } from "jotai"
import { atomEffect as atomWithEffect } from "jotai-effect"
import { atomWithObservable } from "jotai/utils"
import { ReplaySubject } from "rxjs"

import { logObservableUpdate } from "./logObservableUpdate"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SubscribeFn<T = unknown> = (callback: (value: T) => void) => UnsubscribeFn
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SubscriptionInfo<T = any> = {
  subject: ReplaySubject<T>
  unsubscribe: UnsubscribeFn | null
  subscribed: boolean
  atomEffect: Atom<T>
  atomObservable: Atom<T | Promise<T>>
}

const SUBSCRIPTIONS = new WeakMap<SubscribeFn, SubscriptionInfo>()

const ensureSubscription = <T>(subscribe: SubscribeFn<T>, debugLabel?: string) => {
  if (!SUBSCRIPTIONS.has(subscribe)) {
    if (debugLabel) log.debug(`[${debugLabel}] INITIALIZING`)

    const subject = new ReplaySubject<T>(1)

    const atomObservable = atomWithObservable(() => subject.pipe(logObservableUpdate(debugLabel)))

    const atomEffect = atomWithEffect(() => {
      // resume subscribtion on mount
      ensureSubscription(subscribe, debugLabel ? `${debugLabel} - atomEffect` : undefined)

      // unsubscribe on unmount
      return () => {
        // prevent immediate unsubscribe while navigating from one route to another
        setTimeout(() => {
          const sub = SUBSCRIPTIONS.get(subscribe)
          if (sub?.subscribed && sub.unsubscribe && !sub.subject.observed) {
            if (debugLabel) log.debug(`[${debugLabel}] UNSUBSCRIBING`)
            sub.subscribed = false
            sub.unsubscribe()
            sub.unsubscribe = null
          }
        }, 100)
      }
    })

    SUBSCRIPTIONS.set(subscribe, {
      subject,
      atomObservable,
      atomEffect,
      unsubscribe: null,
      subscribed: false,
    })
  }

  const sub = SUBSCRIPTIONS.get(subscribe) as SubscriptionInfo<T>
  if (!sub.subscribed) {
    if (debugLabel) log.debug(`[${debugLabel}] SUBSCRIBING`)

    // can't just test unsubscribe to be null because some subscriptions (ex balanceTotals) update synchronously, it would cause an infinite render loop
    // => dedicated boolean to be set prior starting the subscription
    sub.subscribed = true
    sub.unsubscribe = subscribe((value) => {
      if (debugLabel) log.debug(`[${debugLabel}] UPDATING (callback)`, { value })
      if (sub.subscribed) sub.subject.next(value)
    })
  }

  return sub
}

export const atomWithSubscription = <T>(subscribe: SubscribeFn<T>, debugLabel?: string) =>
  atom((get) => {
    const sub = ensureSubscription(subscribe, debugLabel)
    get(sub.atomEffect)
    return get(sub.atomObservable)
  })
