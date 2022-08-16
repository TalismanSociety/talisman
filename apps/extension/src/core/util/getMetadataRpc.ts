import { db } from "@core/libs/db"
import RpcFactory from "@core/libs/RpcFactory"
import * as Sentry from "@sentry/browser"

import { getRuntimeVersion } from "./getRuntimeVersion"

// key = `${chainId}-${specVersion}`
// used to cache non-latest metadataRpc in memory (when user is browsing transaction history)
const metadataRpcCache: Record<string, `0x${string}`> = {}

export const getMetadataRpc = async (chainId: string, blockHash?: string) => {
  const currentMetadataRpc = await db.metadataRpc.get(chainId)

  try {
    // identify associated specVersion
    const runtimeVersion = await getRuntimeVersion(chainId, blockHash)
    const specVersion = Number(runtimeVersion.specVersion)
    const cacheKey = `${chainId}-${specVersion}`

    // check if current cached metadata matches current specVersion
    if (currentMetadataRpc?.specVersion === specVersion) return currentMetadataRpc.metadataRpc
    if (metadataRpcCache[cacheKey]) return metadataRpcCache[cacheKey]

    // pull from blockchain
    const metadataRpc = await RpcFactory.send<`0x${string}`>(chainId, "state_getMetadata", [
      blockHash,
    ])

    // persist either in store (if latest) or in memory cache
    if (!currentMetadataRpc || specVersion > currentMetadataRpc.specVersion)
      await db.metadataRpc.put({
        chainId,
        specVersion,
        metadataRpc,
      })
    else metadataRpcCache[cacheKey] = metadataRpc

    return metadataRpc
  } catch (err) {
    Sentry.captureException(err, { tags: { chainId } })

    // We may end up here if there is no healthy RPC when signing a transaction.
    // if anything goes wrong, and if we have one, return the latest metadataRpc from the store
    // In most case, the latest metadataRpc from our store will do the work.
    if (currentMetadataRpc?.metadataRpc) return currentMetadataRpc?.metadataRpc

    throw new Error("Failed to fetch metadata for chain " + chainId)
  }
}
