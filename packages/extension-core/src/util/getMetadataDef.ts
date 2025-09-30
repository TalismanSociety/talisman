import { assert, isHex } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { DotNetwork, DotNetworkId, NetworkId } from "@talismn/chaindata-provider"
import { fetchBestMetadata, MAX_SUPPORTED_METADATA_VERSION } from "@talismn/sapi"
import { getConstantValueFromMetadata, getMetadataVersion } from "@talismn/scale"
import { DEBUG, log } from "extension-shared"
import { withRetry } from "viem"

import { sentry } from "../config/sentry"
import { db } from "../db"
import { decodeMetadataRpc, encodeMetadataRpc } from "../domains/metadata/helpers"
import { metadataUpdatesStore } from "../domains/metadata/metadataUpdates"
import { TalismanMetadataDef } from "../domains/substrate/types"
import { chainConnector } from "../rpcs/chain-connector"
import { chaindataProvider } from "../rpcs/chaindata"
import { getRuntimeVersion } from "./getRuntimeVersion"

const CACHE_RESULTS = new Map<string, TalismanMetadataDef>()
const CACHE_PROMISES = new Map<string, Promise<TalismanMetadataDef | undefined>>()

const getResultCacheKey = (genesisHash: HexString, specVersion?: number) =>
  !specVersion || !genesisHash ? null : `${genesisHash}-${specVersion}`
const getPromiseCacheKey = (chainIdOrHash: string, specVersion?: number) =>
  [chainIdOrHash, specVersion ?? ""].join("-")

/**
 *
 * @param chainIdOrHash chainId or genesisHash
 * @param specVersion
 * @returns
 */
export const getMetadataDef = async (
  chainIdOrHash: string,
  specVersion?: number,
): Promise<TalismanMetadataDef | undefined> => {
  const cacheKey = getPromiseCacheKey(chainIdOrHash, specVersion)

  // prevent concurrent calls that would fetch the same data
  if (!CACHE_PROMISES.has(cacheKey))
    CACHE_PROMISES.set(
      cacheKey,
      getMetadataDefInner(chainIdOrHash, specVersion).finally(() => {
        CACHE_PROMISES.delete(cacheKey)
      }),
    )

  return CACHE_PROMISES.get(cacheKey)
}

const getMetadataDefInner = async (
  chainIdOrHash: string,
  specVersion?: number,
): Promise<TalismanMetadataDef | undefined> => {
  const [chain, genesisHash] = await getChainAndGenesisHashFromIdOrHash(chainIdOrHash)

  const cacheKey = getResultCacheKey(genesisHash, specVersion)
  if (cacheKey && CACHE_RESULTS.has(cacheKey)) return CACHE_RESULTS.get(cacheKey)

  try {
    // eslint-disable-next-line no-var
    var storeMetadata = await db.metadata.get(genesisHash)

    // having a metadataRpc on expected specVersion is ideal scenario, don't go further
    if (storeMetadata?.metadataRpc && specVersion === storeMetadata.specVersion)
      if (
        // TODO remove this check once PAPI handles metadata hash for v16
        getMetadataVersion(decodeMetadataRpc(storeMetadata.metadataRpc)) <=
        MAX_SUPPORTED_METADATA_VERSION
      )
        return storeMetadata
  } catch (cause) {
    const message = `Failed to load chain metadata from the db for chain ${genesisHash}`
    const error = new Error(message, { cause })
    log.error(error)
    throw error
  }

  // TODO remove this block once PAPI handles metadata hash for v16
  if (
    storeMetadata?.metadataRpc &&
    getMetadataVersion(decodeMetadataRpc(storeMetadata.metadataRpc)) >
      MAX_SUPPORTED_METADATA_VERSION
  )
    storeMetadata = undefined

  if (!chain) {
    log.warn(`Metadata for unknown chain isn't up to date`, storeMetadata?.chain ?? genesisHash)
    return storeMetadata
  }

  try {
    const { specVersion: runtimeSpecVersion } = await getRuntimeVersion(chain.id)
    assert(!specVersion || specVersion === runtimeSpecVersion, "specVersion mismatch")

    // if specVersion wasn't specified, but store version is up to date, look no further
    if (storeMetadata?.metadataRpc && runtimeSpecVersion === storeMetadata.specVersion)
      return storeMetadata

    // check cache using runtimeSpecVersion
    const cacheKey = getResultCacheKey(genesisHash, runtimeSpecVersion) as string
    if (CACHE_RESULTS.has(cacheKey)) return CACHE_RESULTS.get(cacheKey)

    // mark as updating in database (can be picked up by frontend via subscription)
    metadataUpdatesStore.set(genesisHash, true)

    // developer helpers to test all states, uncomment as needed
    // if (DEBUG) await sleep(5_000)
    // if (DEBUG) throw new Error("Failed to update metadata (debugging)")

    // fetch the metadataDef from the chain
    const newData = await withRetry(() =>
      fetchMetadataDefFromChain(chain, genesisHash, runtimeSpecVersion),
    )
    if (!newData) return // unable to get data from rpc, return nothing

    // save in cache
    CACHE_RESULTS.set(cacheKey, newData)
    metadataUpdatesStore.set(genesisHash, false)

    // if requested version is outdated, cache it and return it without updating store
    if (storeMetadata && runtimeSpecVersion < storeMetadata.specVersion) return newData

    // persist in store
    await db.metadata.put(newData)

    return newData
  } catch (cause) {
    if ((cause as Error).message !== "RPC connect timeout reached") {
      const error = new Error("Failed to update metadata", { cause })
      log.error(error)
      sentry.captureException(error, { extra: { genesisHash, chainId: chain?.id ?? "UNKNOWN" } })
    }
    metadataUpdatesStore.set(genesisHash, false)
  }

  return storeMetadata
}

export const getChainAndGenesisHashFromIdOrHash = async (chainIdOrGenesisHash: string) => {
  const chainId = !isHex(chainIdOrGenesisHash) ? chainIdOrGenesisHash : null
  const hash = isHex(chainIdOrGenesisHash) ? chainIdOrGenesisHash : null

  const chain = chainId
    ? await chaindataProvider.getNetworkById(chainId, "polkadot")
    : hash
      ? await chaindataProvider.getNetworkByGenesisHash(hash)
      : null

  const genesisHash = hash ?? chain?.genesisHash
  // throw if neither a known chainId or genesisHash
  assert(genesisHash, `Unknown chain: ${chainIdOrGenesisHash}`)

  return [chain, genesisHash] as const
}

export const fetchMetadataDefFromChain = async (
  chain: DotNetwork,
  genesisHash: `0x${string}`,
  runtimeSpecVersion?: number,

  /** defaults to `getLatestMetadataRpc`, but can be overridden */
  fetchMethod: (chainId: NetworkId) => Promise<`0x${string}`> = getLatestMetadataRpc,
): Promise<TalismanMetadataDef | undefined> => {
  const [metadataRpc, chainProperties] = await Promise.all([
    fetchMethod(chain.id),
    chainConnector.send(chain.id, "system_properties", [], true),
  ]).catch((rpcError) => {
    // not a useful error, do not log to sentry
    if ((rpcError as Error).message === "RPC connect timeout reached") {
      log.error(rpcError)
      metadataUpdatesStore.set(genesisHash as HexString, false)
      return [undefined, undefined]
    }
    // otherwise allow wrapping try/catch to handle
    throw rpcError
  })

  // unable to get data from rpc, return nothing
  if (!metadataRpc || !chainProperties) return

  const { spec_version } = getConstantValueFromMetadata<{ spec_version: number }>(
    metadataRpc,
    "System",
    "Version",
  )
  if (runtimeSpecVersion !== undefined && spec_version !== runtimeSpecVersion)
    throw new Error(
      `specVersion mismatch: expected ${runtimeSpecVersion}, metadata got ${spec_version}`,
    )

  return {
    genesisHash,
    chain: chain.name,
    specVersion: spec_version,
    ss58Format: chainProperties.ss58Format,
    tokenSymbol: Array.isArray(chainProperties.tokenSymbol)
      ? chainProperties.tokenSymbol[0]
      : chainProperties.tokenSymbol,
    tokenDecimals: Array.isArray(chainProperties.tokenDecimals)
      ? chainProperties.tokenDecimals[0]
      : chainProperties.tokenDecimals,
    metaCalls: undefined, // won't be used anymore, yeet
    metadataRpc: encodeMetadataRpc(metadataRpc),
  } as TalismanMetadataDef
}

// useful for developer when testing updates
if (DEBUG) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hostObj = globalThis as any

  hostObj.clearMetadata = async () => {
    await db.metadata.clear()
    CACHE_RESULTS.clear()
  }

  hostObj.makeOldMetadata = async () => {
    const allMetadata = await db.metadata.toArray()
    await db.metadata.bulkPut(allMetadata.map((m) => ({ ...m, specVersion: 1 })))
    CACHE_RESULTS.clear()
  }
}

export const getLatestMetadataRpc = (chainId: DotNetworkId) =>
  fetchBestMetadata((method, params, isCacheable) =>
    chainConnector.send(chainId, method, params, isCacheable, { expectErrors: true }),
  )

export const getLegacyMetadataRpc = (chainId: DotNetworkId) =>
  chainConnector.send<HexString>(chainId, "state_getMetadata", [], true)
