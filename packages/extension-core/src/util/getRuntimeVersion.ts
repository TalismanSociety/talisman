import type { IRuntimeVersionBase } from "@polkadot/types/types/interfaces"

import { chainConnector } from "../rpcs/chain-connector"

// properly typed on the few fields that matter to us
type IRuntimeVersion = IRuntimeVersionBase & {
  specName: string
  specVersion: number
  transactionVersion: number
}

// key = `${chainId}-${blockHash}`
// very small object, it shouldn't be an issue to cache them until browser closes
const cache: Record<string, IRuntimeVersion> = {}

export const getRuntimeVersion = async (chainId: string, blockHash?: string) => {
  // only cache if blockHash is specified
  const cacheKey = blockHash ? `${chainId}-${blockHash}` : null

  // retrieve from cache if it exists
  if (cacheKey && cache[cacheKey]) return cache[cacheKey]

  // fetch from chain
  const method = "state_getRuntimeVersion"
  const params = [blockHash]
  const result = await chainConnector.send<IRuntimeVersion>(chainId, method, params, true)

  // store in cache
  if (cacheKey) cache[cacheKey] = result

  return result
}
