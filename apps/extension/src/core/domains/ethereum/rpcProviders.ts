import { db } from "@core/libs/db"
import { providers } from "ethers"

import { CustomEvmNetwork, EvmNetwork } from "./types"

export type GetProviderOptions = {
  /** If true, returns a provider which will batch requests */
  batch?: boolean
}

const ethereumNetworkToProvider = (
  ethereumNetwork: EvmNetwork | CustomEvmNetwork,
  { batch }: GetProviderOptions = {}
): providers.JsonRpcProvider | null => {
  if (
    !Array.isArray(ethereumNetwork.rpcs) ||
    ethereumNetwork.rpcs.filter(({ isHealthy }) => isHealthy).length === 0
  )
    return null

  const url = ethereumNetwork.rpcs.filter(({ isHealthy }) => isHealthy).map(({ url }) => url)[0]
  const network = { name: ethereumNetwork.name ?? "unknown network", chainId: ethereumNetwork.id }

  return batch === true
    ? new providers.JsonRpcBatchProvider(url, network)
    : new providers.JsonRpcProvider(url, network)
}

const ethereumNetworkProviders: Record<number, providers.JsonRpcProvider> = {}
const ethereumNetworkBatchProviders: Record<number, providers.JsonRpcBatchProvider> = {}

export const getProviderForEthereumNetwork = (
  ethereumNetwork: EvmNetwork | CustomEvmNetwork,
  { batch }: GetProviderOptions = {}
): providers.JsonRpcProvider | null => {
  const providersStore = batch === true ? ethereumNetworkBatchProviders : ethereumNetworkProviders

  if (providersStore[ethereumNetwork.id]) return providersStore[ethereumNetwork.id]

  const provider = ethereumNetworkToProvider(ethereumNetwork, { batch })
  if (provider === null) return null

  providersStore[ethereumNetwork.id] = provider
  return providersStore[ethereumNetwork.id]
}

export const getProviderForEvmNetworkId = async (
  evmNetworkId: number,
  { batch }: GetProviderOptions = {}
): Promise<providers.JsonRpcProvider | null> => {
  const network = await db.evmNetworks.get(evmNetworkId)
  if (network) return getProviderForEthereumNetwork(network, { batch })
  return null
}
