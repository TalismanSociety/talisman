import { atomWithObservable } from "jotai/utils"
import { Observable, shareReplay } from "rxjs"

import { UnsubscribeFn } from "@extension/core"
import { log } from "@extension/shared"

type SubscribeFn<T> = (callback: (value: T) => void) => UnsubscribeFn

export type AtomWithSubscriptionOptions = {
  debugLabel?: string
  /**
   * If true, the subscribtion will be closed when there is no more subscribers.
   *
   * Defaults to false
   */
  refCount?: boolean
}

export const atomWithSubscription = <T>(
  subscribe: SubscribeFn<T>,
  options?: AtomWithSubscriptionOptions
) => {
  const { debugLabel, refCount } = Object.assign({ refCount: false }, options)

  return atomWithObservable(() =>
    new Observable<T>((subscriber) => {
      if (debugLabel) log.debug(`[${debugLabel}] subscribing`)

      let unsubscribe: UnsubscribeFn | undefined

      try {
        unsubscribe = subscribe((value) => {
          if (debugLabel) log.debug(`[${debugLabel}] callback`, { value })
          subscriber.next(value)
        })
      } catch (err) {
        log.error("Failed to subscribe", { debugLabel, err })
        subscriber.error(err)
      }

      return () => {
        if (debugLabel) log.debug(`[${debugLabel}] unsubscribing`)
        unsubscribe?.()
      }
    }).pipe(shareReplay({ bufferSize: 1, refCount }))
  )
}
