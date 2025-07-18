import { IChainConnectorDot } from "@talismn/chain-connectors"
import { DotNetworkId } from "@talismn/chaindata-provider"

// cache the promise so it can be shared across multiple calls
const CACHE_GET_SPEC_VERSION = new Map<string, Promise<number>>()

const fetchSpecVersion = async (chainConnector: IChainConnectorDot, networkId: DotNetworkId) => {
  const { specVersion } = await chainConnector.send<{ specVersion: number }>(
    networkId,
    "state_getRuntimeVersion",
    [],
    true,
  )
  return specVersion
}

/**
 * fetches the spec version of a network. current request is cached in case of multiple calls (all balance modules will kick in at once)
 */
export const getSpecVersion = async (
  chainConnector: IChainConnectorDot,
  networkId: DotNetworkId,
) => {
  if (CACHE_GET_SPEC_VERSION.has(networkId)) return CACHE_GET_SPEC_VERSION.get(networkId)!

  const pResult = fetchSpecVersion(chainConnector, networkId)

  CACHE_GET_SPEC_VERSION.set(networkId, pResult)

  try {
    return await pResult
  } catch (cause) {
    throw new Error(`Failed to fetch specVersion for network ${networkId}`, { cause })
  } finally {
    CACHE_GET_SPEC_VERSION.delete(networkId)
  }
}
