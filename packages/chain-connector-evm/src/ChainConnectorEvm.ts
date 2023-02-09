import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@talismn/chaindata-provider"
import { ChaindataEvmNetworkProvider } from "@talismn/chaindata-provider"
import { ethers } from "ethers"

import { RPC_CALL_TIMEOUT } from "./constants"
import log from "./log"
import { BatchRpcProvider, StandardRpcProvider, getHealthyRpc, resolveRpcUrl } from "./util"

export type GetProviderOptions = {
  /** If true, returns a provider which will batch requests */
  batch?: boolean
}

const getEvmNetworkProviderCacheKey = (evmNetworkId: EvmNetworkId, batch?: boolean) =>
  `id-${evmNetworkId}-${batch ? "batch" : "standard"}`
const getUrlProviderCacheKey = (url: string, batch?: boolean) =>
  `url-${url}-${batch ? "batch" : "standard"}`

export class ChainConnectorEvm {
  #chaindataEvmNetworkProvider: ChaindataEvmNetworkProvider
  #onfinalityApiKey: string

  // cache for providers
  //
  // per network providers will change over time if they get unhealthy
  // per url providers do not change over time
  //
  // the cached object is a promise which will return the provider
  // if we didn't store the promise, multiple rpc calls sent before an rpc provider is ready
  // would end up in us creating multiple rpc providers, instead of what we want which is
  // to wait for the single provider to spin up
  #providerCache: Map<
    EvmNetworkId | string,
    Promise<ethers.providers.JsonRpcProvider | ethers.providers.JsonRpcBatchProvider | null>
  > = new Map()

  // cache for rpc urls per network
  //
  // always initialized with the order defined in the database
  // when an error is raised, push the current rpc to the back of the list
  #rpcUrlsCache: Map<EvmNetworkId | string, string[]> = new Map()

  constructor(chaindataEvmNetworkProvider: ChaindataEvmNetworkProvider, onfinalityApiKey: string) {
    this.#chaindataEvmNetworkProvider = chaindataEvmNetworkProvider
    this.#onfinalityApiKey = onfinalityApiKey
  }

  async getProviderForEvmNetworkId(
    evmNetworkId: EvmNetworkId,
    { batch }: GetProviderOptions = {}
  ): Promise<ethers.providers.JsonRpcProvider | null> {
    const network = await this.#chaindataEvmNetworkProvider.getEvmNetwork(evmNetworkId)
    if (!network) return null

    return await this.getProviderForEvmNetwork(network, { batch })
  }

  async getProviderForEvmNetwork(
    evmNetwork: EvmNetwork | CustomEvmNetwork,
    { batch }: GetProviderOptions = {}
  ): Promise<ethers.providers.JsonRpcProvider | null> {
    const cacheKey = getEvmNetworkProviderCacheKey(evmNetwork.id, batch)

    if (!this.#providerCache.has(cacheKey)) {
      // store the promise straight away
      // otherwise another call to `getProviderForEvmNetwork` would create a new provider,
      // instead of what we want which is to wait for this provider to spin up
      this.#providerCache.set(cacheKey, this.newProviderFromEvmNetwork(evmNetwork, { batch }))
    }

    return (await this.#providerCache.get(cacheKey)) ?? null
  }

  clearRpcProvidersCache(evmNetworkId?: EvmNetworkId, clearRpcUrlsCache = true) {
    if (evmNetworkId) {
      this.#providerCache.delete(getEvmNetworkProviderCacheKey(evmNetworkId, false))
      this.#providerCache.delete(getEvmNetworkProviderCacheKey(evmNetworkId, true))
      if (clearRpcUrlsCache) this.#rpcUrlsCache.delete(evmNetworkId)
    } else {
      this.#providerCache.clear()
      if (clearRpcUrlsCache) this.#rpcUrlsCache.clear()
    }
  }

  private rotateRpcUrls(evmNetworkId: EvmNetworkId) {
    const prevUrls = this.#rpcUrlsCache.get(evmNetworkId) as string[]
    if (!prevUrls || prevUrls.length < 2) return prevUrls

    const nextUrls = prevUrls.slice(1).concat(prevUrls[0])
    this.#rpcUrlsCache.set(evmNetworkId, nextUrls)

    return nextUrls
  }

  private async newProviderFromEvmNetwork(
    evmNetwork: EvmNetwork | CustomEvmNetwork,
    { batch }: GetProviderOptions = {}
  ): Promise<ethers.providers.JsonRpcProvider | null> {
    if (!Array.isArray(evmNetwork.rpcs)) return null

    const network = {
      name: evmNetwork.name ?? "unknown network",
      chainId: parseInt(evmNetwork.id, 10),
    }

    // initialize cache for rpc urls if empty
    if (!this.#rpcUrlsCache.has(evmNetwork.id)) {
      const rpcUrls = evmNetwork.rpcs.map(({ url }) => resolveRpcUrl(url, this.#onfinalityApiKey))
      this.#rpcUrlsCache.set(evmNetwork.id, rpcUrls)
    }
    let rpcUrls = this.#rpcUrlsCache.get(evmNetwork.id) as string[]

    const url = await getHealthyRpc(rpcUrls, network)
    if (!url) return null

    // if healthy rpc url isn't the first one, rotate rpc urls cache to reflect that
    while (rpcUrls.includes(url) && rpcUrls[0] !== url) rpcUrls = this.rotateRpcUrls(evmNetwork.id)

    const urlCacheKey = getUrlProviderCacheKey(url, batch)
    if (!this.#providerCache.has(urlCacheKey)) {
      const connection: ethers.utils.ConnectionInfo = {
        url,
        errorPassThrough: true,
        timeout: RPC_CALL_TIMEOUT,

        // number of attempts when a request is throttled (429) : default is 12, minimum is 1
        // use 1 so we change RPC as soon as we detect a throttling, without trying again
        throttleLimit: 1,
      }

      const provider =
        batch === true
          ? new BatchRpcProvider(connection, network)
          : new StandardRpcProvider(connection, network)

      // in case an error is thrown, rotate rpc urls cache
      // also clear provider cache to force logic going through getHealthyRpc again on next call
      provider.on("error", (...args: unknown[]) => {
        log.error("EVM RPC error %s (%s)", url, batch ? "batch" : "standard", args)
        this.rotateRpcUrls(evmNetwork.id)
        this.clearRpcProvidersCache(evmNetwork.id, false)
      })

      this.#providerCache.set(urlCacheKey, Promise.resolve(provider))
    }

    return (await this.#providerCache.get(urlCacheKey)) ?? null
  }
}
