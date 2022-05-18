import RpcFactory from "@core/libs/RpcFactory"
import { RuntimeVersion } from "@polkadot/types/interfaces"

// key = `${chainId}-${blockHash}`
// very small object, it shouldn't be an issue to cache them until browser closes
const cache: Record<string, Promise<RuntimeVersion>> = {}

export const getRuntimeVersion = (chainId: string, blockHash?: string) => {
  const cacheKey = blockHash ? `${chainId}-${blockHash}` : null

  if (cacheKey && cache[cacheKey]) return cache[cacheKey]

  const promiseResult = RpcFactory.send<RuntimeVersion>(chainId, "state_getRuntimeVersion", [
    blockHash,
  ])

  if (cacheKey) cache[cacheKey] = promiseResult

  return promiseResult
}
