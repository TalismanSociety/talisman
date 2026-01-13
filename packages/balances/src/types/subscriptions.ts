/**
 * A callback with either an error or a result.
 */
export interface SubscriptionCallback<Result> {
  (error: null, result: Result): void
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  (error: any, result?: never): void
}

/**
 * A function which cancels a subscription when called.
 */
export type UnsubscribeFn = () => void
