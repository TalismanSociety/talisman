import { EthNetwork } from "@talismn/chaindata-provider"
import { createPublicClient, PublicClient } from "viem"

import { clearChainsCache, getChainFromEvmNetwork } from "./getChainFromEvmNetwork"
import { getTransportForEvmNetwork, TransportOptions } from "./getTransportForEvmNetwork"

const MUTLICALL_BATCH_WAIT = 25
const MUTLICALL_BATCH_SIZE = 100

const HTTP_BATCH_WAIT = 25
const HTTP_BATCH_SIZE_WITH_MULTICALL = 10
const HTTP_BATCH_SIZE_WITHOUT_MULTICALL = 30

// cache to reuse previously created public clients
const publicClientCache = new Map<string, PublicClient>()

export const clearPublicClientCache = (evmNetworkId?: string) => {
  clearChainsCache(evmNetworkId)

  if (evmNetworkId) publicClientCache.delete(evmNetworkId)
  else publicClientCache.clear()
}

export const getEvmNetworkPublicClient = (network: EthNetwork): PublicClient => {
  const chain = getChainFromEvmNetwork(network)

  if (!publicClientCache.has(network.id)) {
    if (!network.rpcs.length) throw new Error("No RPCs found for Ethereum network")

    const batch = chain.contracts?.multicall3
      ? { multicall: { wait: MUTLICALL_BATCH_WAIT, batchSize: MUTLICALL_BATCH_SIZE } }
      : undefined

    const transportOptions: TransportOptions = {
      batch: {
        batchSize: chain.contracts?.multicall3
          ? HTTP_BATCH_SIZE_WITH_MULTICALL
          : HTTP_BATCH_SIZE_WITHOUT_MULTICALL,
        wait: HTTP_BATCH_WAIT,
      },
    }

    const transport = getTransportForEvmNetwork(network, transportOptions)

    publicClientCache.set(
      network.id,
      createPublicClient({
        chain,
        transport,
        batch,
      }),
    )
  }

  return publicClientCache.get(network.id) as PublicClient
}
