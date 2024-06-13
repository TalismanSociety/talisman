import {
  BehaviorSubject,
  ReplaySubject,
  Subject,
  bufferWhen,
  combineLatest,
  concatMap,
  filter,
  map,
  share,
  tap,
  zip,
} from "rxjs"

import { createSubscription, unsubscribe } from "../handlers/subscriptions"
import { MessageTypesWithSubscriptions, MessageTypesWithSubscriptionsById } from "../types"
import { Port, RequestIdOnly } from "../types/base"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Store<T extends { [index: string]: any }> {
  get(): Promise<T>
  get<K extends keyof T, V = T[K]>(key: K): Promise<V>
  get<K extends keyof T, V = T[K]>(key?: K): Promise<T | V>
  set(value: Partial<T>): Promise<T>
  replace(value: T): Promise<T>
  mutate(mutation: (currentValue: T) => T): Promise<T>
  delete(keys: keyof T | Array<keyof T>): Promise<T>

  observable: Subject<T>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class StorageProvider<T extends { [index: string]: any }> implements Store<T> {
  readonly #prefix: string = ""
  readonly #initialData: Partial<T> = {}
  readonly #subscriptionSubject = new ReplaySubject<T>(1)

  /** Prevents storage corruption by using atomic writes. */
  readonly #mutationQueue = new Subject<{
    /** A function which takes the currentValue and returns the new value. */
    mutation: (currentValue: T) => T
    /** A function which is called after the mutation completes. */
    callback?: (newValue: T) => void
  }>()

  constructor(prefix: string, initialData: Partial<T> = {}) {
    this.#prefix = prefix
    this.#initialData = initialData

    // Subscribe storage to the queue of atomic mutations.
    this.#subscribeMutationQueue()

    // Subscribe replay subject to storage changes.
    chrome.storage.onChanged.addListener(this.#onStorageChanged)

    // Publish initial value from storage into replay subject.
    this.get().then((value) => this.#subscriptionSubject.next(value))
  }

  get observable() {
    return this.#subscriptionSubject
  }

  /** Clean up resources used by this store. */
  destroy = () => {
    this.#mutationQueue.unsubscribe()
    chrome.storage.onChanged.removeListener(this.#onStorageChanged)
  }

  /**
   * Sets up the mutationQueue pipeline.
   *
   * This method subscribes to `this.#mutationQueue` inside the class constructor.
   * It shouldn't be called from anywhere else.
   */
  #subscribeMutationQueue = (): void => {
    const isMutating = new BehaviorSubject(false)
    const hasPendingMutations = new BehaviorSubject(false)

    // set hasPendingMutations to true when we receive a mutation
    this.#mutationQueue.subscribe(() => hasPendingMutations.next(true))

    // a buffer which collects all of the new mutations while we wait for running mutations to complete
    const newMutationBuffer = this.#mutationQueue.pipe(
      bufferWhen(
        () =>
          // emit the buffer once we've fetched the current value from the store
          currentValueReady
      )
    )

    // an observable which, if:
    //   pending mutations exist, and:
    //   we're not currently running any mutations,
    // then it fetches the current value from the store
    const currentValueReady = combineLatest([hasPendingMutations, isMutating]).pipe(
      // only proceed if we have pending mutations and we're not waiting for any running mutations to complete
      filter(([hasPendingMutations, isMutating]) => hasPendingMutations && !isMutating),

      // set isMutating to true
      tap(() => isMutating.next(true)),

      // get the current value from the store
      // concatMap ensures that we only call this.get() once at a time by waiting for it to return
      concatMap(async () => await this.get()),

      // set hasPendingMutations to false
      // any mutations we've received thus far have been collected inside the newMutationBuffer
      tap(() => hasPendingMutations.next(false)),

      // multicast the currentValue to all subscribers
      share()
    )

    // for each batch of mutations, get the current value we retrieved from the store and the mutations to run
    zip([currentValueReady, newMutationBuffer])
      .pipe(
        // run each mutation against the output of the previous mutation
        map(([currentValue, mutations]): [T, Array<() => void>] => {
          const callbacks = []
          let newValue = currentValue

          for (const { mutation, callback } of mutations) {
            newValue = mutation(newValue)
            const valueAfterThisMutation = newValue
            if (callback) callbacks.push(() => callback(valueAfterThisMutation))
          }

          return [newValue, callbacks]
        }),

        // store the result in browser storage, then notify the callbacks once stored
        // concatMap ensures that we wait before proceeding
        concatMap(async ([newValue, callbacks]) => {
          await chrome.storage.local.set({ [this.#prefix]: newValue })

          callbacks.forEach((callback) => callback())
        }),

        // set isMutating to false
        tap(() => isMutating.next(false))
      )
      .subscribe()
  }

  /**
   * Inform subscribers when the storage has changed.
   *
   * This method subscribes to `chrome.storage.onChanged` inside the class constructor.
   * It shouldn't be called from anywhere else.
   */
  #onStorageChanged = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== "local") return
    const change = changes[this.#prefix]
    if (!change) return

    const { newValue } = change
    if (!newValue) return

    this.#subscriptionSubject.next({
      ...this.#initialData,
      ...newValue,
    })
  }

  /** Get a stored value based on key. */
  async get(): Promise<T>
  async get<K extends keyof T, V = T[K]>(key: K): Promise<V>
  async get<K extends keyof T, V = T[K]>(key?: K): Promise<T | V> {
    const initializedStorage = {
      ...this.#initialData,
      ...(await chrome.storage.local.get(this.#prefix))[this.#prefix],
    }

    return key !== undefined ? initializedStorage[key] : initializedStorage
  }

  /**
   * Set key:value pairs.
   *
   * @note If the new value depends on the current value, use `Store.mutate` instead of `Store.set`.
   * @example
   * // Not safe:
   * const currentValue = await store.get()
   * const newValue = doSomethingWithCurrentValue(currentValue)
   * await store.set(newValue)
   * // Safe:
   * await store.mutate(currentValue => {
   *   const newValue = doSomethingWithCurrentValue(currentValue)
   *   return newValue
   * })
   */
  async set(value: Partial<T>): Promise<T> {
    const mutation = (currentValue: T) => ({ ...currentValue, ...value })
    return await this.mutate(mutation)
  }

  /** Replace stored value. */
  async replace(value: T): Promise<T> {
    const mutation = () => value
    return await this.mutate(mutation)
  }

  /** Clear all stored data. */
  async clear(): Promise<boolean> {
    const mutation = () => ({} as T)
    return await new Promise((resolve) =>
      this.#mutationQueue.next({ mutation, callback: () => resolve(true) })
    )
  }

  /**
   * Push an atomic mutation to the queue.
   *
   * @returns A Promise which resolves to the new value once the mutation has been processed.
   */
  async mutate(mutation: (currentValue: T) => T): Promise<T> {
    return await new Promise((resolve) => this.#mutationQueue.next({ mutation, callback: resolve }))
  }

  /** Delete key:value pairs. */
  async delete(keys: keyof T | Array<keyof T>): Promise<T> {
    const keysArray = Array.isArray(keys) ? keys : [keys]

    const mutation = (currentValue: T) => {
      const updated = { ...currentValue }
      for (const key of keysArray) {
        delete updated[key]
      }
      return updated
    }

    return await this.mutate(mutation)
  }
}

class SubscribableStorageProvider<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { [index: string]: any },
  SubscribeAllMessage extends MessageTypesWithSubscriptions
> extends StorageProvider<T> {
  public subscribe(id: string, port: Port, unsubscribeCallback?: () => void): boolean {
    const cb = createSubscription<SubscribeAllMessage>(id, port)

    const subscription = this.observable.subscribe(cb)

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.unsubscribe()
      if (unsubscribeCallback) unsubscribeCallback()
    })

    return true
  }
}

class SubscribableByIdStorageProvider<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { [index: string]: any },
  SubscribeAllMessage extends MessageTypesWithSubscriptions,
  SubscribeByIdMessage extends MessageTypesWithSubscriptionsById
> extends SubscribableStorageProvider<T, SubscribeAllMessage> {
  public subscribeById(
    id: string,
    port: Port,
    request: RequestIdOnly,
    unsubscribeCallback?: () => void
  ): boolean {
    const cb = createSubscription<SubscribeByIdMessage>(id, port)

    const subscription = this.observable.subscribe((data) => cb(data[request.id]))

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.unsubscribe()
      if (unsubscribeCallback) unsubscribeCallback()
    })

    return true
  }
}

export { StorageProvider, SubscribableStorageProvider, SubscribableByIdStorageProvider }
