import { Observable } from "rxjs"

import { SubscriptionCallback, UnsubscribeFn } from "../../../types"

/**
 * Converts a subscription function into an Observable
 *
 * The type of a subscription function which can be converted into an observable:
 *
 *     <TArgs, TResult>(...arguments: TArgs, callback: SubscriptionCallback<TResult>) => UnsubscribeFn
 */
export const asObservable =
  <T extends unknown[], R>(handler: (...args: [...T, SubscriptionCallback<R>]) => UnsubscribeFn) =>
  (...args: T) =>
    new Observable<R>((subscriber) => {
      const callback: SubscriptionCallback<R> = (error, result) =>
        error ? subscriber.error(error) : subscriber.next(result)

      const unsubscribe = handler(...args, callback)

      return unsubscribe
    })
