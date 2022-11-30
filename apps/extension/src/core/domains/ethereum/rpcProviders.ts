import { db } from "@core/libs/db"
import { log } from "@core/log"
import { providers } from "ethers"

import { CustomEvmNetwork, EvmNetwork } from "./types"

export type GetProviderOptions = {
  /** If true, returns a provider which will batch requests */
  batch?: boolean
}

// cache for providers per network (will change over time if they get unhealthy)
const PROVIDERS_BY_NETWORK_ID = new Map<string, Promise<providers.JsonRpcProvider | null>>()
const getProviderByNetworkIdCacheKey = (evmNetworkId: number, batch?: boolean) =>
  `${evmNetworkId}-${batch ? "batch" : "standard"}`

// cache for providers per url (do not change over time)
const PROVIDERS_BY_URL = new Map<string, providers.JsonRpcProvider>()
const getProviderByUrlCacheKey = (url: string, batch?: boolean) =>
  `${url}-${batch ? "batch" : "standard"}`

const RPC_HEALTHCHECK_TIMEOUT = 10_000

const isHealthyRpc = async (url: string, chainId: number) => {
  try {
    // StaticJsonRpcProvider is better suited for this as it will not do health check requests on it's own
    const provider = new providers.StaticJsonRpcProvider(url, {
      chainId,
      name: `EVM Network ${chainId}`,
    })

    // check that RPC responds in time
    const rpcChainId = await Promise.race([
      provider.send("eth_chainId", []),
      new Promise((_, reject) => setTimeout(() => reject("timeout"), RPC_HEALTHCHECK_TIMEOUT)),
    ])

    // with expected chain id
    return parseInt(rpcChainId, 16) === chainId
  } catch (err) {
    log.error("isHealthyRpc : unhealthy RPC %s", url, { err })
    return false
  }
}

const getHealthyRpc = async (rpcUrls: string[], network: providers.Network) => {
  const unhealthyRpcs: string[] = []

  try {
    for (const rpcUrl of rpcUrls) {
      if (await isHealthyRpc(rpcUrl, network.chainId)) {
        return rpcUrl
      } else {
        unhealthyRpcs.push(rpcUrl)
      }
    }
  } finally {
    // TODO persist to db ? only for non-custom networks ? (user should have control over this)
    // push unhealthy rpcs to the back of the array
    if (unhealthyRpcs.length > 0 && unhealthyRpcs.length !== rpcUrls.length) {
      rpcUrls.splice(0, unhealthyRpcs.length)
      rpcUrls.push(...unhealthyRpcs)
    }
  }

  return null
}

const getEvmNetworkProvider = async (
  ethereumNetwork: EvmNetwork | CustomEvmNetwork,
  { batch }: GetProviderOptions = {}
): Promise<providers.JsonRpcProvider | null> => {
  if (!Array.isArray(ethereumNetwork.rpcs)) return null

  const urls = ethereumNetwork.rpcs.map(({ url }) => url)
  const network = { name: ethereumNetwork.name ?? "unknown network", chainId: ethereumNetwork.id }

  const url = await getHealthyRpc(urls, network)
  if (!url) return null

  const cacheKey = getProviderByUrlCacheKey(url, batch)
  if (!PROVIDERS_BY_URL.has(cacheKey)) {
    const provider =
      batch === true
        ? new providers.JsonRpcBatchProvider(url, network)
        : new providers.JsonRpcProvider(url, network)

    // clear cache to force logic going through getHealthyRpc again on next call
    provider.on("error", (...args: unknown[]) => {
      log.error("RPC error %s", cacheKey, args)
      PROVIDERS_BY_NETWORK_ID.delete(getProviderByNetworkIdCacheKey(ethereumNetwork.id, false))
      PROVIDERS_BY_NETWORK_ID.delete(getProviderByNetworkIdCacheKey(ethereumNetwork.id, true))
    })

    PROVIDERS_BY_URL.set(cacheKey, provider)
  }

  return PROVIDERS_BY_URL.get(cacheKey) as providers.JsonRpcProvider
}

export const getProviderForEthereumNetwork = (
  ethereumNetwork: EvmNetwork | CustomEvmNetwork,
  { batch }: GetProviderOptions = {}
) => {
  const cacheKey = getProviderByNetworkIdCacheKey(ethereumNetwork.id, batch)

  //cache the promise to prevent multiple RPC calls in case of multiple callers in a short time
  if (!PROVIDERS_BY_NETWORK_ID.has(cacheKey))
    PROVIDERS_BY_NETWORK_ID.set(cacheKey, getEvmNetworkProvider(ethereumNetwork, { batch }))

  return PROVIDERS_BY_NETWORK_ID.get(cacheKey) as Promise<providers.JsonRpcProvider | null>
}

export const getProviderForEvmNetworkId = async (
  evmNetworkId: number,
  { batch }: GetProviderOptions = {}
): Promise<providers.JsonRpcProvider | null> => {
  const network = await db.evmNetworks.get(evmNetworkId)
  if (network) return getProviderForEthereumNetwork(network, { batch })
  return null
}
