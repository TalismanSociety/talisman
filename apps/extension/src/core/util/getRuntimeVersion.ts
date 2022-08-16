import RpcFactory from "@core/libs/RpcFactory"
import { RuntimeVersion } from "@polkadot/types/interfaces"

// key = `${chainId}-${blockHash}`
// very small object, it shouldn't be an issue to cache them until browser closes
const cache: Record<string, RuntimeVersion> = {}

export const getRuntimeVersion = async (chainId: string, blockHash?: string) => {
  // only cache if blockHash is specified
  const cacheKey = blockHash ? `${chainId}-${blockHash}` : null

  // retrieve from cache if it exists
  if (cacheKey && cache[cacheKey]) return cache[cacheKey]

  // fetch from chain
  const method = "state_getRuntimeVersion"
  const params = [blockHash]
  const result = await RpcFactory.send<RuntimeVersion>(chainId, method, params)

  // store in cache
  if (cacheKey) cache[cacheKey] = result

  return result
}
