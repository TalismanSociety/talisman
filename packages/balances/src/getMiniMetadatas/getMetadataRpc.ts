import { IChainConnectorDot } from "@talismn/chain-connectors"
import { DotNetworkId } from "@talismn/chaindata-provider"
import { fetchBestMetadata } from "@talismn/sapi"
import { isAbortError } from "@talismn/util"

// share requests as all modules will call this at once
const CACHE = new Map<string, Promise<`0x${string}`>>()

export const getMetadataRpc = async (
  chainConnector: IChainConnectorDot,
  networkId: DotNetworkId,
) => {
  if (CACHE.has(networkId)) return CACHE.get(networkId)!

  const pResult = fetchBestMetadata(
    (method, params, isCacheable) =>
      chainConnector.send(networkId, method, params, isCacheable, { expectErrors: true }),
    // do not allow fallback to v14 unless unavailable.
    // substrate-native and substrate-hydration need v15 metadata for runtime api calls
    false,
  )

  CACHE.set(networkId, pResult)

  try {
    return await pResult
  } catch (cause) {
    if (isAbortError(cause)) throw cause
    throw new Error(`Failed to fetch metadataRpc for network ${networkId}`, { cause })
  } finally {
    CACHE.delete(networkId)
  }
}
