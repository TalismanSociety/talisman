/* eslint-disable @typescript-eslint/no-explicit-any */
// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Adapted from polkadot.js

import { DEBUG } from "extension-shared"
import { Observable, Subscription } from "rxjs"

import type { KnownSubscriptionDataTypes, MessageTypesWithSubscriptions } from "../types"
import type { Port } from "../types/base"

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
  transformFn: (value: any) => Promise<KnownSubscriptionDataTypes<TMessageType>> = async (value) =>
    value
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

export class ObservableSubscriptions {
  readonly #subscriptions = new Map<string, Subscription>()

  public readonly subscriptions = this.#subscriptions as ReadonlyMap<
    string,
    Omit<Subscription, "unsubscribe">
  >

  public readonly subscribe = <
    TMessageType extends MessageTypesWithSubscriptions,
    TObservableValue,
    TReturn extends KnownSubscriptionDataTypes<TMessageType>
  >(
    _message: TMessageType,
    id: string,
    port: Port,
    observable: Observable<TObservableValue>,
    ...rest: TObservableValue extends TReturn
      ? []
      : [transform: (value: TObservableValue) => TReturn]
  ) => {
    const [transform] = rest

    this.unsubscribe(id)

    const cb = createSubscription<TMessageType>(id, port)

    const subscription = observable.subscribe((data) =>
      cb(transform?.(data) ?? (data as any as TReturn))
    )

    const teardown = () => this.unsubscribe(id)

    subscription.add(teardown)
    port.onDisconnect.addListener(teardown)

    this.#subscriptions.set(id, subscription)

    return id
  }

  public readonly unsubscribe = (id: string) => {
    unsubscribe(id)
    this.#subscriptions.get(id)?.unsubscribe()
    this.#subscriptions.delete(id)
  }
}

/**
 * Allows us to clean up *subscriptions with an async setup* when a tab disconnects.
 *
 * In this example, our subscription cleanup logic will never be run if the tab
 * is closed before the `port.onDisconnect.addListener` method has been executed.
 * That is, in the few moments it takes for `updateAndWaitForUpdatedChaindata` to run:
 *
 *     case "pri(balances.subscribe)": {
 *       // set up subscription
 *       await updateAndWaitForUpdatedChaindata()
 *       ...
 *
 *       // unsafely set up cleanup trigger
 *       port.onDisconnect.addListener(() => {
 *         // clean up subscription
 *         ...
 *       })
 *
 * Using this function we can set up the cleanup trigger before we call `await`
 * as part of the subscription setup.  
 * The value returned from this function is a `Promise` which we can safely chain
 * onto our cleanup logic after we have asynchronously set up our subscription:
 *
 *     case "pri(balances.subscribe)": {
 *       // set up cleanup trigger
         const onDisconnected = portDisconnected(port)
 *
 *       // set up subscription
 *       await updateAndWaitForUpdatedChaindata()
 *       ...
 *
 *       // safely set up cleanup logic
 *       onDisconnected.then(() => {
 *         // clean up subscription
 *         ...
 *       })
 */
export const portDisconnected = (port: Port) =>
  new Promise<void>((resolve) => port.onDisconnect.addListener(() => resolve()))
