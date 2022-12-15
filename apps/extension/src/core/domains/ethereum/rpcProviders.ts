import { db } from "@core/libs/db"
import { log } from "@core/log"
import { getRpcUrlWithApiKey } from "@ui/util/getRpcUrlWithApiKey"
import { ethers } from "ethers"
import { throwAfter } from "talisman-utils"

import { CustomEvmNetwork, EvmNetwork } from "./types"

export type GetProviderOptions = {
  /** If true, returns a provider which will batch requests */
  batch?: boolean
}

const RPC_HEALTHCHECK_TIMEOUT = 10_000
const RPC_CALL_TIMEOUT = 20_000

const isUnhealthyRpcError = (err: any) => {
  // expected errors that are not related to RPC health
  // ex : throw revert on a transaction call that fails
  if (["processing response error"].includes(err.reason)) return false

  // if unknown, assume RPC is unhealthy
  return true
}

class StandardRpcProvider extends ethers.providers.JsonRpcProvider {
  async send(method: string, params: Array<any>): Promise<any> {
    try {
      return await super.send(method, params)
    } catch (err) {
      // emit error so rpc manager considers this rpc unhealthy
      if (isUnhealthyRpcError(err)) this.emit("error", err)
      throw err
    }
  }
}

class BatchRpcProvider extends ethers.providers.JsonRpcBatchProvider {
  async send(method: string, params: Array<any>): Promise<any> {
    try {
      return await super.send(method, params)
    } catch (err) {
      // emit error so rpc manager considers this rpc unhealthy
      if (isUnhealthyRpcError(err)) this.emit("error", err)
      throw err
    }
  }
}

// cache for providers per network (will change over time if they get unhealthy)
const PROVIDERS_BY_NETWORK_ID = new Map<string, Promise<ethers.providers.JsonRpcProvider | null>>()
const getProviderByNetworkIdCacheKey = (evmNetworkId: number, batch?: boolean) =>
  `${evmNetworkId}-${batch ? "batch" : "standard"}`

// cache for providers per url (do not change over time)
const PROVIDERS_BY_URL = new Map<string, ethers.providers.JsonRpcProvider>()
const getProviderByUrlCacheKey = (url: string, batch?: boolean) =>
  `${url}-${batch ? "batch" : "standard"}`

const isHealthyRpc = async (url: string, chainId: number) => {
  try {
    // StaticJsonRpcProvider is better suited for this as it will not do health check requests on it's own
    const provider = new ethers.providers.StaticJsonRpcProvider(url, {
      chainId,
      name: `EVM Network ${chainId}`,
    })

    // check that RPC responds in time
    const rpcChainId = await Promise.race([
      provider.send("eth_chainId", []),
      throwAfter(RPC_HEALTHCHECK_TIMEOUT, "timeout"),
    ])

    // with expected chain id
    return parseInt(rpcChainId, 16) === chainId
  } catch (err) {
    log.error("Unhealthy EVM RPC %s", url, { err })
    return false
  }
}

const getHealthyRpc = async (rpcUrls: string[], network: ethers.providers.Network) => {
  for (const rpcUrl of rpcUrls) if (await isHealthyRpc(rpcUrl, network.chainId)) return rpcUrl

  // TODO update order and persist to database, code ready below
  // // const unhealthyRpcs: string[] = []

  // // try {
  // //   for (const rpcUrl of rpcUrls) {
  // //     if (await isHealthyRpc(rpcUrl, network.chainId)) {
  // //       return rpcUrl
  // //     } else {
  // //       unhealthyRpcs.push(rpcUrl)
  // //     }
  // //   }
  // // } finally {
  // //   // TODO persist to db ? only for non-custom networks ? (user should have control over this)
  // //   // push unhealthy rpcs to the back of the array
  // //   if (unhealthyRpcs.length > 0 && unhealthyRpcs.length !== rpcUrls.length) {
  // //     rpcUrls.splice(0, unhealthyRpcs.length)
  // //     rpcUrls.push(...unhealthyRpcs)
  // //   }
  // // }

  return null
}

const getEvmNetworkProvider = async (
  ethereumNetwork: EvmNetwork | CustomEvmNetwork,
  { batch }: GetProviderOptions = {}
): Promise<ethers.providers.JsonRpcProvider | null> => {
  if (!Array.isArray(ethereumNetwork.rpcs)) return null

  const urls = ethereumNetwork.rpcs.map(({ url }) => url).map(getRpcUrlWithApiKey)
  const network = { name: ethereumNetwork.name ?? "unknown network", chainId: ethereumNetwork.id }

  const url = await getHealthyRpc(urls, network)
  if (!url) return null

  const cacheKey = getProviderByUrlCacheKey(url, batch)
  if (!PROVIDERS_BY_URL.has(cacheKey)) {
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
      PROVIDERS_BY_NETWORK_ID.delete(getProviderByNetworkIdCacheKey(ethereumNetwork.id, false))
      PROVIDERS_BY_NETWORK_ID.delete(getProviderByNetworkIdCacheKey(ethereumNetwork.id, true))
    })

    PROVIDERS_BY_URL.set(cacheKey, provider)
  }

  return PROVIDERS_BY_URL.get(cacheKey) as ethers.providers.JsonRpcProvider
}

export const getProviderForEthereumNetwork = (
  ethereumNetwork: EvmNetwork | CustomEvmNetwork,
  { batch }: GetProviderOptions = {}
) => {
  const cacheKey = getProviderByNetworkIdCacheKey(ethereumNetwork.id, batch)

  //cache the promise to prevent multiple RPC calls in case of multiple callers in a short time
  if (!PROVIDERS_BY_NETWORK_ID.has(cacheKey))
    PROVIDERS_BY_NETWORK_ID.set(cacheKey, getEvmNetworkProvider(ethereumNetwork, { batch }))

  return PROVIDERS_BY_NETWORK_ID.get(cacheKey) as Promise<ethers.providers.JsonRpcProvider | null>
}

export const getProviderForEvmNetworkId = async (
  evmNetworkId: number,
  { batch }: GetProviderOptions = {}
): Promise<ethers.providers.JsonRpcProvider | null> => {
  const network = await db.evmNetworks.get(evmNetworkId)
  if (network) return getProviderForEthereumNetwork(network, { batch })
  return null
}

export const clearEvmRpcProviderCache = (evmNetworkId: number) => {
  PROVIDERS_BY_NETWORK_ID.delete(getProviderByNetworkIdCacheKey(evmNetworkId, false))
  PROVIDERS_BY_NETWORK_ID.delete(getProviderByNetworkIdCacheKey(evmNetworkId, true))
}

export const clearEvmRpcProvidersCache = () => {
  PROVIDERS_BY_NETWORK_ID.clear()
}
