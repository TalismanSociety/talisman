import { map, combineLatest } from "rxjs"
import { SubscribableByIdStorageProvider } from "@core/libs/Store"
import addCustomChainRpcs from "@core/util/addCustomChainRpcs"
import {
  Chain,
  ChainId,
  ChainList,
  Port,
  RequestIdOnly,
  SubscriptionCallback,
  UnsubscribeFn,
} from "@core/types"
import { settingsStore } from "@core/domains/app"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import pick from "lodash/pick"

import { DEBUG } from "@core/constants"
import { getChainData } from "./api"

const storageKey = "chains"

const minimumHydrationInterval = 43_200_000 // 43_200_000ms = 43_200s = 720m = 12 hours

export class ChainStore extends SubscribableByIdStorageProvider<
  ChainList,
  "pri(chains.subscribe)",
  "pri(chains.byid.subscribe)"
> {
  #lastHydratedAt: number = 0

  /**
   * Fetch or subscribe to chains by chainId.
   *
   * @param chainIds - Optional filter for chains by chainId.
   * @param callback - Optional subscription callback.
   * @returns Either a `ChainList`, or an unsubscribe function if the `callback` parameter was given.
   */
  async chains(chainIds?: ChainId[]): Promise<ChainList>
  async chains(
    chainIds: ChainId[],
    callback: SubscriptionCallback<ChainList>
  ): Promise<UnsubscribeFn>
  async chains(
    chainIds?: ChainId[],
    callback?: SubscriptionCallback<ChainList>
  ): Promise<ChainList | UnsubscribeFn> {
    await this.hydrateStore()

    // subscription request
    if (callback !== undefined) {
      // create filter observable (allows subscriber to be informed when useTestnets changes)
      const chainFilterObservable = settingsStore.observable.pipe(
        map(({ useTestnets }) =>
          composeFilters(chainIdsFilter(chainIds), testnetFilter(useTestnets))
        )
      )

      // subscribe to chains
      const subscription = combineLatest([this.observable, chainFilterObservable]).subscribe({
        next: ([chains, chainFilter]) => callback(null, chainFilter(chains)),
        error: (error) => callback(error),
      })

      // return unsubscribe function
      return subscription.unsubscribe.bind(subscription)
    }

    // once-off request
    const chains = await this.get()
    const useTestnets = await settingsStore.get("useTestnets")
    const chainFilter = composeFilters(chainIdsFilter(chainIds), testnetFilter(useTestnets))
    return chainFilter(chains)
  }

  /**
   * Fetch or subscribe to a single chain by chainId.
   *
   * @param chainId - The chain to fetch or subscribe to.
   * @param callback - Optional subscription callback.
   * @returns Either a `Chain`, or an unsubscribe function if the `callback` parameter was given.
   */
  async chain(chainId: ChainId): Promise<Chain | undefined>
  async chain(
    chainId: ChainId,
    callback: SubscriptionCallback<Chain | undefined>
  ): Promise<UnsubscribeFn>
  async chain(
    chainId: ChainId,
    callback?: SubscriptionCallback<Chain | undefined>
  ): Promise<Chain | undefined | UnsubscribeFn> {
    // subscription request
    if (callback !== undefined) {
      const innerCallback: SubscriptionCallback<ChainList> = (error, chains) => {
        if (error !== null) return callback(error)
        if (chains === undefined)
          return callback(new Error(`No chains returned in request for chain ${chainId}`))
        callback(null, chains[chainId])
      }

      return await this.chains([chainId], innerCallback)
    }

    // once-off request
    return (await this.chains([chainId]))[chainId]
  }

  public subscribe(id: string, port: Port, unsubscribeCallback?: () => void): boolean {
    const cb = createSubscription<"pri(chains.subscribe)">(id, port)

    // TODO: Make this.chains into `this.observable` so we can use subscribe method from StorageProvider
    const subscription = this.chains([], (error, chains) => !error && chains && cb(chains))

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.then((unsubscribe) => unsubscribe())
      if (unsubscribeCallback) unsubscribeCallback()
    })

    return true
  }

  public subscribeById(
    id: string,
    port: Port,
    request: RequestIdOnly,
    unsubscribeCallback?: () => void
  ): boolean {
    const cb = createSubscription<"pri(chains.byid.subscribe)">(id, port)

    // TODO: Make this.chains into `this.observable` so we can use subscribeById method from StorageProvider
    const subscription = this.chain(request.id, (error, chain) => !error && chain && cb(chain))

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.then((unsubscribe) => unsubscribe())
      if (unsubscribeCallback) unsubscribeCallback()
    })

    return true
  }

  /**
   * Hydrate the store with the latest chains from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the store has been hydrated, or false if the hydration was skipped.
   */
  private async hydrateStore(): Promise<boolean> {
    const now = Date.now()
    if (now - this.#lastHydratedAt < minimumHydrationInterval) return false

    try {
      const data = await getChainData()
      const chainList = chainsToChainList(addCustomChainRpcs(data?.chains || []))

      if (Object.keys(chainList).length <= 0)
        throw new Error("Ignoring empty chaindata chains response")

      this.replace(chainList)
      this.#lastHydratedAt = now

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      DEBUG && console.error(error)

      return false
    }
  }
}

const composeFilters =
  (...filters: Array<(chains: ChainList) => ChainList>) =>
  (chains: ChainList): ChainList =>
    filters.reduce((composed, filter) => filter(composed), chains)

const testnetFilter = (useTestnets: boolean) =>
  !useTestnets
    ? // Filter by !isTestnet
      (chains: ChainList) =>
        chainsToChainList(Object.values(chains).filter(({ isTestnet }) => !isTestnet))
    : // Don't filter
      (chains: ChainList) => chains

const chainIdsFilter = (chainIds?: ChainId[]) =>
  Array.isArray(chainIds) && chainIds.length > 0
    ? // Filter by chainId
      (chains: ChainList) => pick(chains, chainIds)
    : // Don't filter
      (chains: ChainList) => chains

/**
 * Helper function to convert `Chain[]` to `ChainList`.
 */
const chainsToChainList = (chains: Chain[]): ChainList =>
  chains.reduce((allChains: ChainList, chain: Chain) => ({ ...allChains, [chain.id]: chain }), {})

const chainStore = new ChainStore(storageKey)
export default chainStore
