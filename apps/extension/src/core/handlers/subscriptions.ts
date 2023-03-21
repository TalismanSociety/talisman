// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Adapted from polkadot.js

import { DEBUG } from "@core/constants"
import type { KnownSubscriptionDataTypes, MessageTypesWithSubscriptions } from "@core/types"
import type { Port } from "@core/types/base"
import { Observable } from "rxjs"
type Subscriptions = Record<string, Port>

const subscriptions: Subscriptions = {} // return a subscription callback, that will send the data to the caller via the port

// Creates a subscription for any BehaviourSubject observable
// transformFn is an optional function that takes the output of the given observable and
// transform it to the expected shape of the subscription data. Identity function used by default.
export function genericSubscription<TMessageType extends MessageTypesWithSubscriptions>(
  id: string,
  port: Port,
  observable: Observable<any>,
  transformFn: (value: any) => KnownSubscriptionDataTypes<TMessageType> = (value) => value
): boolean {
  const cb = createSubscription<TMessageType>(id, port)
  const subscription = observable.subscribe((data) => cb(transformFn(data)))

  port.onDisconnect.addListener((): void => {
    unsubscribe(id)
    subscription.unsubscribe()
  })

  return true
}

// Creates a subscription for any BehaviourSubject observable
// transformFn is an optional function that takes the output of the given observable and
// transform it to the expected shape of the subscription data. Identity function used by default.
export function genericAsyncSubscription<TMessageType extends MessageTypesWithSubscriptions>(
  id: string,
  port: Port,
  observable: Observable<any>,
  transformFn: (value: any) => Promise<KnownSubscriptionDataTypes<TMessageType>> = (value) => value
): boolean {
  const cb = createSubscription<TMessageType>(id, port)
  const subscription = observable.subscribe((data) => transformFn(data).then(cb))

  port.onDisconnect.addListener((): void => {
    unsubscribe(id)
    subscription.unsubscribe()
  })

  return true
}

// return a subscription callback, that will send the data to the caller via the port
export function createSubscription<TMessageType extends MessageTypesWithSubscriptions>(
  id: string,
  port: Port
): (data: KnownSubscriptionDataTypes<TMessageType>) => void {
  subscriptions[id] = port
  return (data): void => {
    if (subscriptions[id]) {
      try {
        port.postMessage({ id, subscription: data })
      } catch (error) {
        DEBUG &&
          // eslint-disable-next-line no-console
          console.error(
            "Error on posting message for subscription - subscription might be closed. ",
            { error },
            { id, subscription: subscriptions[id] },
            { data }
          )
        unsubscribe(id)
      }
    }
  }
}

// clear a previous subscriber
export function unsubscribe(id: string): void {
  // In the case that the subscription has already been closed, subscriptions[id] may not exist
  if (subscriptions[id]) delete subscriptions[id]
}
