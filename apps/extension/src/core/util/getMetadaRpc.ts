import { metadataRpcStore } from "@core/domains/metadata"
import RpcFactory from "@core/libs/RpcFactory"
import { getRuntimeVersion } from "./getRuntimeVersion"

// key = `${chainId}-${specVersion}`
// used to cache non-latest metadataRpc in memory (when user is browsing transaction history)
const metadataRpcCache: Record<string, `0x${string}`> = {}

export const getMetadaRpc = async (chainId: string, blockHash?: string) => {
  // identify associated specVersion
  const runtimeVersion = await getRuntimeVersion(chainId, blockHash)
  const specVersion = Number(runtimeVersion.specVersion)
  const cacheKey = `${chainId}-${specVersion}`

  // check if it's either in the store or in the cache
  const currentMetadataRpc = await metadataRpcStore.get(chainId)

  if (currentMetadataRpc?.specVersion === specVersion) return currentMetadataRpc.metadataRpc
  if (metadataRpcCache[cacheKey]) return metadataRpcCache[cacheKey]

  // pull from blockchain
  const metadataRpc = await RpcFactory.send<`0x${string}`>(chainId, "state_getMetadata", [
    blockHash,
  ])

  // persist either in store (if latest) or in memory cache
  if (!currentMetadataRpc || specVersion > currentMetadataRpc.specVersion)
    await metadataRpcStore.setItem({
      chainId,
      specVersion,
      metadataRpc,
    })
  else metadataRpcCache[cacheKey] = metadataRpc

  return metadataRpc
}
