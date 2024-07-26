import { EvmNetwork, Token } from "@talismn/chaindata-provider"
import { createPublicClient, PublicClient } from "viem"

import { clearChainsCache, getChainFromEvmNetwork } from "./getChainFromEvmNetwork"
import { getTransportForEvmNetwork } from "./getTransportForEvmNetwork"

const MUTLICALL_BATCH_WAIT = 25
const MUTLICALL_BATCH_SIZE = 1000

// cache to reuse previously created public clients
const publicClientCache = new Map<string, PublicClient>()

export const clearPublicClientCache = (evmNetworkId?: string) => {
  clearChainsCache(evmNetworkId)

  if (evmNetworkId) publicClientCache.delete(evmNetworkId)
  else publicClientCache.clear()
}

type PublicClientOptions = {
  onFinalityApiKey?: string
}

export const getEvmNetworkPublicClient = (
  evmNetwork: EvmNetwork,
  nativeToken: Token | null,
  options: PublicClientOptions = {}
): PublicClient => {
  const chain = getChainFromEvmNetwork(evmNetwork, nativeToken)

  if (!publicClientCache.has(evmNetwork.id)) {
    if (!evmNetwork.rpcs?.length) throw new Error("No RPCs found for EVM network")

    const batch = chain.contracts?.multicall3
      ? { multicall: { wait: MUTLICALL_BATCH_WAIT, batchSize: MUTLICALL_BATCH_SIZE } }
      : undefined

    const transport = getTransportForEvmNetwork(evmNetwork, options)

    publicClientCache.set(
      evmNetwork.id,
      createPublicClient({
        chain,
        transport,
        batch,
      })
    )
  }

  return publicClientCache.get(evmNetwork.id) as PublicClient
}
