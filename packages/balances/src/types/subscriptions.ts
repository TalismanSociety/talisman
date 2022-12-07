/**
 * A callback with either an error or a result.
 */
export interface SubscriptionCallback<Result> {
  (error: null, result: Result): void
  (error: any, result?: never): void
}

/**
 * A function which cancels a subscription when called.
 */
export type UnsubscribeFn = () => void
