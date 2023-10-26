import { EvmNetwork, Token } from "@talismn/chaindata-provider"
import { PublicClient, createPublicClient, fallback, http } from "viem"

import { clearChainsCache, getChainFromEvmNetwork } from "./getChainFromEvmNetwork"
import { addOnfinalityApiKey } from "./util"

const BATCH_WAIT = 25
const BATCH_SIZE = 30

// create clients as needed, to prevent unnecessary health checks
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
  nativeToken: Token,
  options: PublicClientOptions = {}
): PublicClient => {
  const chain = getChainFromEvmNetwork(evmNetwork, nativeToken)

  if (!publicClientCache.has(evmNetwork.id)) {
    if (!evmNetwork.rpcs?.length) throw new Error("No RPCs found for EVM network")

    const batch = chain.contracts?.multicall3 ? { multicall: { wait: BATCH_WAIT } } : undefined
    const transport = chain.contracts?.multicall3
      ? http(undefined, {
          batch: {
            batchSize: BATCH_SIZE,
            wait: BATCH_WAIT,
          },
        })
      : fallback(
          evmNetwork.rpcs.map((rpc) =>
            http(addOnfinalityApiKey(rpc.url, options.onFinalityApiKey), {
              batch: { wait: BATCH_WAIT },
            })
          )
        )

    publicClientCache.set(evmNetwork.id, createPublicClient({ chain, transport, batch }))
  }

  return publicClientCache.get(evmNetwork.id) as PublicClient
}
