import { ChainConnector } from "@talismn/chain-connector"
import { DotNetworkId } from "@talismn/chaindata-provider"
import { fetchBestMetadata } from "@talismn/sapi"

// share requests as all modules will call this at once
const CACHE = new Map<string, Promise<`0x${string}`>>()

export const getMetadataRpc = async (chainConnector: ChainConnector, networkId: DotNetworkId) => {
  if (CACHE.has(networkId)) return CACHE.get(networkId)!

  const pResult = fetchBestMetadata(
    (...args) => chainConnector.send(networkId, ...args),
    true, // allow fallback to 14 as modules dont use any v15 or v16 specifics yet
  )

  CACHE.set(networkId, pResult)

  try {
    return await pResult
  } catch (cause) {
    throw new Error(`Failed to fetch metadataRpc for network ${networkId}`, { cause })
  } finally {
    CACHE.delete(networkId)
  }
}
