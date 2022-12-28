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

  constructor(chaindataEvmNetworkProvider: ChaindataEvmNetworkProvider) {
    this.#chaindataEvmNetworkProvider = chaindataEvmNetworkProvider
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

  clearRpcProvidersCache(evmNetworkId?: EvmNetworkId) {
    if (evmNetworkId) {
      this.#providerCache.delete(getEvmNetworkProviderCacheKey(evmNetworkId, false))
      this.#providerCache.delete(getEvmNetworkProviderCacheKey(evmNetworkId, true))
    } else this.#providerCache.clear()
  }

  private async newProviderFromEvmNetwork(
    evmNetwork: EvmNetwork | CustomEvmNetwork,
    { batch }: GetProviderOptions = {}
  ): Promise<ethers.providers.JsonRpcProvider | null> {
    if (!Array.isArray(evmNetwork.rpcs)) return null

    const urls = evmNetwork.rpcs.map(({ url }) => url).map(resolveRpcUrl)
    const network = {
      name: evmNetwork.name ?? "unknown network",
      chainId: parseInt(evmNetwork.id, 10),
    }

    const url = await getHealthyRpc(urls, network)
    if (!url) return null

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

      // clear cache to force logic going through getHealthyRpc again on next call
      // this error is thrown only on chainId mismatch or blocking errors such as HTTP 429
      // but it won't trigger if RPC can't be reached anymore
      provider.on("error", (...args: unknown[]) => {
        log.error("EVM RPC error %s (%s)", url, batch ? "batch" : "standard", args)
        this.#providerCache.delete(getEvmNetworkProviderCacheKey(evmNetwork.id, false))
        this.#providerCache.delete(getEvmNetworkProviderCacheKey(evmNetwork.id, true))
      })

      this.#providerCache.set(urlCacheKey, Promise.resolve(provider))
    }

    return (await this.#providerCache.get(urlCacheKey)) ?? null
  }
}
