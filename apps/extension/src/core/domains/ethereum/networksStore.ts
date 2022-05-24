import { chainStore } from "@core/domains/chains"
import { tokenStore } from "@core/domains/tokens"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import { SubscribableByIdStorageProvider } from "@core/libs/Store"
import {
  Chain,
  ChainList,
  EthereumNetwork,
  EthereumNetworkList,
  Port,
  RequestIdOnly,
  SubscriptionCallback,
  TokenList,
  UnsubscribeFn,
} from "@core/types"
import * as Sentry from "@sentry/browser"
import { ethers, providers } from "ethers"
import pick from "lodash/pick"
import { Observable, combineLatest } from "rxjs"

const storageKey = "ethereumNetworks"

export class EthereumNetworkStore extends SubscribableByIdStorageProvider<
  EthereumNetworkList,
  "pri(eth.networks.subscribe)",
  "pri(eth.networks.byid.subscribe)"
> {
  async ethereumNetworks(ids?: number[]): Promise<EthereumNetworkList>
  async ethereumNetworks(
    ids: number[],
    callback: SubscriptionCallback<EthereumNetworkList>
  ): Promise<UnsubscribeFn>
  async ethereumNetworks(
    ids?: number[],
    callback?: SubscriptionCallback<EthereumNetworkList>
  ): Promise<EthereumNetworkList | UnsubscribeFn> {
    const networkFilter = composeFilters(networkIdsFilter(ids))

    // subscription request
    if (callback !== undefined) {
      // create observable for chains
      const chainsObservable: Observable<ChainList> = new Observable((subscriber) => {
        chainStore.chains([], (error, chains) =>
          error ? Sentry.captureException(error) : chains && subscriber.next(chains)
        )
      })

      // create observable for tokens
      const tokensObservable: Observable<TokenList> = new Observable((subscriber) => {
        tokenStore.tokens([], (error, tokens) =>
          error ? Sentry.captureException(error) : tokens && subscriber.next(tokens)
        )
      })

      // subscribe to networks
      const subscription = combineLatest([
        this.observable,
        chainsObservable,
        tokensObservable,
      ]).subscribe({
        next: ([ethereumNetworks, chains, tokens]) =>
          callback(
            null,
            networkFilter({ ...ethereumNetworks, ...chainsToEthereumNetworks(chains, tokens) })
          ),
        error: (error) => callback(error),
      })

      // return unsubscribe function
      return subscription.unsubscribe.bind(subscription)
    }

    // once-off request
    const [ethereumNetworks, chains, tokens] = await Promise.all([
      this.get(),
      chainStore.chains(),
      tokenStore.tokens(),
    ])

    return networkFilter({ ...ethereumNetworks, ...chainsToEthereumNetworks(chains, tokens) })
  }

  async ethereumNetwork(id: number): Promise<EthereumNetwork | undefined>
  async ethereumNetwork(
    id: number,
    callback: SubscriptionCallback<EthereumNetwork | undefined>
  ): Promise<UnsubscribeFn>
  async ethereumNetwork(
    id: number,
    callback?: SubscriptionCallback<EthereumNetwork | undefined>
  ): Promise<EthereumNetwork | undefined | UnsubscribeFn> {
    // subscription request
    if (callback !== undefined) {
      const innerCallback: SubscriptionCallback<EthereumNetworkList> = (
        error,
        ethereumNetworks
      ) => {
        if (error !== null) return callback(error)
        if (ethereumNetworks === undefined)
          return callback(
            new Error(`No ethereum networks returned in request for network with id ${id}`)
          )
        callback(null, ethereumNetworks[id])
      }

      return await this.ethereumNetworks([id], innerCallback)
    }

    // once-off request
    return (await this.ethereumNetworks([id]))[id]
  }

  public async clear(): Promise<void> {
    // there are only the custom ones in the store, so replace with empty object is safe
    await this.replace({})
  }

  public subscribe(id: string, port: Port, unsubscribeCallback?: () => void): boolean {
    const cb = createSubscription<"pri(eth.networks.subscribe)">(id, port)

    // TODO: Make this.ethereumNetworks into `this.observable` so we can use subscribe method from StorageProvider
    const subscription = this.ethereumNetworks(
      [],
      (error, ethereumNetworks) => !error && ethereumNetworks && cb(ethereumNetworks)
    )

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
    const cb = createSubscription<"pri(eth.networks.byid.subscribe)">(id, port)

    // TODO: Make this.ethereumNetworks into `this.observable` so we can use subscribeById method from StorageProvider
    const requestId = parseInt(request.id, 10)
    const subscription = this.ethereumNetworks(
      [requestId],
      (error, ethereumNetworks) =>
        !error && ethereumNetworks && ethereumNetworks[requestId] && cb(ethereumNetworks[requestId])
    )

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.then((unsubscribe) => unsubscribe())
      if (unsubscribeCallback) unsubscribeCallback()
    })

    return true
  }
}

const composeFilters =
  (...filters: Array<(ethereumNetworks: EthereumNetworkList) => EthereumNetworkList>) =>
  (ethereumNetworks: EthereumNetworkList): EthereumNetworkList =>
    filters.reduce((composed, filter) => filter(composed), ethereumNetworks)

const networkIdsFilter = (ids?: number[]) =>
  Array.isArray(ids) && ids.length > 0
    ? // Filter by ethereum network id
      (ethereumNetworks: EthereumNetworkList) => pick(ethereumNetworks, ids)
    : // Don't filter
      (ethereumNetworks: EthereumNetworkList) => ethereumNetworks

const chainsToEthereumNetworks = (chains: ChainList, tokens: TokenList): EthereumNetworkList =>
  Object.fromEntries(
    Object.values(chains)
      .filter(
        (chain): chain is Chain & { ethereumId: number } => typeof chain.ethereumId === "number"
      )
      .map((chain): [number, EthereumNetwork] => [
        chain.ethereumId,
        {
          id: chain.ethereumId,
          name: chain.name || chain.id,
          nativeToken: chain?.nativeToken?.id
            ? pick(tokens[chain.nativeToken.id], ["name", "symbol", "decimals"])
            : undefined,
          rpcs: chain.ethereumRpcs || [],
          explorerUrls: chain.ethereumExplorerUrl ? [chain.ethereumExplorerUrl] : [],
          iconUrls: [
            `https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/${chain.id}/logo.svg`,
          ],
          isCustom: false,
        },
      ])
  )

// TODO: create ethereum rpc module to make these available to the extension separately to this store
export const ethereumNetworksToProviders = (
  ethereumNetworks: EthereumNetworkList
): Record<number, providers.FallbackProvider> =>
  Object.fromEntries(
    Object.values(ethereumNetworks)
      .map((ethereumNetwork) => [ethereumNetwork.id, ethereumNetworkToProvider(ethereumNetwork)])
      .filter(([, network]) => network !== null)
  )

export const ethereumNetworkToProvider = (
  ethereumNetwork: EthereumNetwork
): providers.JsonRpcProvider | null =>
  Array.isArray(ethereumNetwork.rpcs) &&
  ethereumNetwork.rpcs.filter(({ isHealthy }) => isHealthy).length > 0
    ? new ethers.providers.JsonRpcProvider(
        ethereumNetwork.rpcs.filter(({ isHealthy }) => isHealthy).map(({ url }) => url)[0],
        { name: ethereumNetwork.name, chainId: ethereumNetwork.id }
      )
    : null

// TODO: Extract to a separate ethereum rpc module
// TODO: Support ethereum rpc failover (ethers.providers.FallbackProvider)
//     new ethers.providers.FallbackProvider(
//       network.rpcs.filter(({ isHealthy }) => isHealthy).map(({ url }) =>
//         new ethers.providers.JsonRpcProvider(url, {
//           name: network.name,
//           chainId: network.id,
//         })
//       )
//     )
const ethereumNetworkProviders: Record<number, providers.JsonRpcProvider> = {}
export const getProviderForEthereumNetwork = (
  ethereumNetwork: EthereumNetwork
): providers.JsonRpcProvider | null => {
  if (ethereumNetworkProviders[ethereumNetwork.id])
    return ethereumNetworkProviders[ethereumNetwork.id]

  const provider = ethereumNetworkToProvider(ethereumNetwork)
  if (provider === null) return null

  ethereumNetworkProviders[ethereumNetwork.id] = provider
  return ethereumNetworkProviders[ethereumNetwork.id]
}

export const getProviderForChainId = async (
  chainId: number
): Promise<providers.JsonRpcProvider | null> => {
  const network = await ethereumNetworkStore.ethereumNetwork(chainId)
  if (network) return getProviderForEthereumNetwork(network)
  return null
}

export const ethereumNetworkStore = new EthereumNetworkStore(storageKey)
export default ethereumNetworkStore
