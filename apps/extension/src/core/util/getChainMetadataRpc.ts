import { ChainMetadataRpc, db } from "@core/libs/db"
import RpcFactory from "@core/libs/RpcFactory"
import { getRuntimeVersion } from "@core/util/getRuntimeVersion"
import * as Sentry from "@sentry/browser"

// key = `${chainId}-${specVersion}-${transactionVersion}`
// used to cache non-latest metadataRpc in memory (when user is browsing transaction history)
const chainMetadataRpcCache: Record<string, ChainMetadataRpc> = {}

export const getChainMetadataRpc = async (
  chainId: string,
  blockHash?: string
): Promise<ChainMetadataRpc> => {
  const storedMetadataRpc = await db.chainMetadataRpc.get(chainId)
  const storedSpecVersion = Number(storedMetadataRpc?.runtimeVersion?.specVersion)
  const storedTransactionVersion = Number(storedMetadataRpc?.runtimeVersion?.transactionVersion)

  try {
    // fetch the latest specVersion + transactionVersion
    const runtimeVersion = await getRuntimeVersion(chainId, blockHash)
    const specVersion = Number(runtimeVersion.specVersion)
    const transactionVersion = Number(runtimeVersion.transactionVersion)
    const cacheKey = `${chainId}-${specVersion}-${transactionVersion}`

    // check if the stored or cached metadata matches the requested specVersion + transactionVersion
    // if it does, return it now
    if (storedMetadataRpc?.cacheKey === cacheKey) return storedMetadataRpc
    if (chainMetadataRpcCache[cacheKey]) return chainMetadataRpcCache[cacheKey]

    // fetch the metadata from the chain
    const method = "state_getMetadata"
    const params = [blockHash]
    const metadataRpc = await RpcFactory.send<`0x${string}`>(chainId, method, params)

    // build the ChainMetadataRpc object
    const chainMetadataRpc = { chainId, cacheKey, metadataRpc, runtimeVersion }

    // persist either in the store (if we fetched the latest specVersion + transactionVersion) or in the memory cache
    if (
      !storedMetadataRpc ||
      (!isNaN(storedSpecVersion) && storedSpecVersion < specVersion) ||
      (!isNaN(storedTransactionVersion) && storedTransactionVersion < specVersion)
    )
      await db.chainMetadataRpc.put(chainMetadataRpc)
    else chainMetadataRpcCache[cacheKey] = chainMetadataRpc

    // return the metadata
    return chainMetadataRpc
  } catch (error) {
    // We may end up here if there is no healthy RPC when signing a transaction.
    // if anything goes wrong, and if we have one, return the latest chainMetadataRpc from the store
    // In most case, the latest chainMetadataRpc from our store will do the work.
    if (storedMetadataRpc?.metadataRpc && storedMetadataRpc?.runtimeVersion)
      return storedMetadataRpc

    const message = `Failed to fetch (or retrieve from cache) metadata for chain ${chainId}`
    Sentry.captureException(message, { tags: { chainId }, extra: { error } })

    // TODO: Return undefined / null / Result<Error> instead of throwing.
    //       The caller can then handle this scenario more explicitly.
    throw new Error(message)
  }
}
