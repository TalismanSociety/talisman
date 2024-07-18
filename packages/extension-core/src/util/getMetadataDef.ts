import { TypeRegistry } from "@polkadot/types"
import { OpaqueMetadata } from "@polkadot/types/interfaces"
import { assert, isHex, u8aToNumber } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { Chain, ChainId } from "@talismn/chaindata-provider"
import { DEBUG, encodeMetadataRpc, log } from "extension-shared"

import { sentry } from "../config/sentry"
import { db } from "../db"
import { metadataUpdatesStore } from "../domains/metadata/metadataUpdates"
import { TalismanMetadataDef } from "../domains/substrate/types"
import { chainConnector } from "../rpcs/chain-connector"
import { chaindataProvider } from "../rpcs/chaindata"
import { getRuntimeVersion } from "./getRuntimeVersion"
import { stateCall } from "./stateCall"

const CACHE_RESULTS = new Map<string, TalismanMetadataDef>()
const CACHE_PROMISES = new Map<string, Promise<TalismanMetadataDef | undefined>>()

const getResultCacheKey = (genesisHash: HexString, specVersion?: number) =>
  !specVersion || !genesisHash ? null : `${genesisHash}-${specVersion}`
const getPromiseCacheKey = (chainIdOrHash: string, specVersion?: number, blockHash?: string) =>
  [chainIdOrHash, specVersion ?? "", blockHash ?? ""].join("-")

/**
 *
 * @param chainIdOrHash chainId or genesisHash
 * @param specVersion
 * @param blockHash if specVersion isn't specified, this is the blockHash where to fetch the correct metadata from
 * @returns
 */
export const getMetadataDef = async (
  chainIdOrHash: string,
  specVersion?: number,
  blockHash?: string
): Promise<TalismanMetadataDef | undefined> => {
  const cacheKey = getPromiseCacheKey(chainIdOrHash, specVersion, blockHash)

  // prevent concurrent calls that would fetch the same data
  if (!CACHE_PROMISES.has(cacheKey))
    CACHE_PROMISES.set(
      cacheKey,
      getMetadataDefInner(chainIdOrHash, specVersion, blockHash).finally(() => {
        CACHE_PROMISES.delete(cacheKey)
      })
    )

  return CACHE_PROMISES.get(cacheKey)
}

const getMetadataDefInner = async (
  chainIdOrHash: string,
  specVersion?: number,
  blockHash?: string
): Promise<TalismanMetadataDef | undefined> => {
  const [chain, genesisHash] = await getChainAndGenesisHashFromIdOrHash(chainIdOrHash)

  const cacheKey = getResultCacheKey(genesisHash, specVersion)
  if (cacheKey && CACHE_RESULTS.has(cacheKey)) return CACHE_RESULTS.get(cacheKey)

  try {
    // eslint-disable-next-line no-var
    var storeMetadata = await db.metadata.get(genesisHash)

    // having a metadataRpc on expected specVersion is ideal scenario, don't go further
    if (storeMetadata?.metadataRpc && specVersion === storeMetadata.specVersion) {
      return storeMetadata
    }
  } catch (cause) {
    const message = `Failed to load chain metadata from the db for chain ${genesisHash}`
    const error = new Error(message, { cause })
    log.error(error)
    throw error
  }

  if (!chain) {
    log.warn(`Metadata for unknown chain isn't up to date`, storeMetadata?.chain ?? genesisHash)
    return storeMetadata
  }

  try {
    const { specVersion: runtimeSpecVersion } = await getRuntimeVersion(chain.id, blockHash)
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
    const newData = await fetchMetadataDefFromChain(
      chain,
      genesisHash,
      runtimeSpecVersion,
      blockHash
    )
    if (!newData) return // unable to get data from rpc, return nothing

    // save in cache
    CACHE_RESULTS.set(cacheKey, newData)

    metadataUpdatesStore.set(genesisHash, false)

    // if requested version is outdated, cache it and return it without updating store
    if (storeMetadata && runtimeSpecVersion < storeMetadata.specVersion) return newData

    // persist in store
    if (storeMetadata) await db.metadata.update(genesisHash, newData)
    else {
      // could be a race condition caused by multiple calls to this function, in the meantime storeMetadata could be out of date
      const latestStoreMetadata = await db.metadata.get(genesisHash)
      if (!latestStoreMetadata || runtimeSpecVersion > latestStoreMetadata.specVersion)
        await db.metadata.put(newData)
    }

    // save full object in cache
    CACHE_RESULTS.set(cacheKey, (await db.metadata.get(genesisHash)) as TalismanMetadataDef)
    return CACHE_RESULTS.get(cacheKey)
  } catch (cause) {
    if ((cause as Error).message !== "RPC connect timeout reached") {
      // not a useful error, do not log to sentry
      const message = `Failed to update metadata for chain ${genesisHash}`
      const error = new Error(message, { cause })
      log.error(error)
      sentry.captureException(error, { extra: { genesisHash } })
    }
    metadataUpdatesStore.set(genesisHash, false)
  }

  return storeMetadata
}

export const getChainAndGenesisHashFromIdOrHash = async (chainIdOrGenesisHash: string) => {
  const chainId = !isHex(chainIdOrGenesisHash) ? chainIdOrGenesisHash : null
  const hash = isHex(chainIdOrGenesisHash) ? chainIdOrGenesisHash : null

  const chain = chainId
    ? await chaindataProvider.chainById(chainId)
    : hash
    ? await chaindataProvider.chainByGenesisHash(hash)
    : null

  const genesisHash = hash ?? chain?.genesisHash
  // throw if neither a known chainId or genesisHash
  assert(genesisHash, `Unknown chain: ${chainIdOrGenesisHash}`)

  return [chain, genesisHash] as const
}

export const fetchMetadataDefFromChain = async (
  chain: Chain,
  genesisHash: `0x${string}`,
  runtimeSpecVersion?: number,
  blockHash?: string,

  /** defaults to `getLatestMetadataRpc`, but can be overridden */
  fetchMethod: (
    chainId: ChainId,
    blockHash?: string
  ) => Promise<`0x${string}`> = getLatestMetadataRpc
): Promise<TalismanMetadataDef | undefined> => {
  const [metadataRpc, chainProperties] = await Promise.all([
    fetchMethod(chain.id, blockHash),
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

  return {
    genesisHash,
    chain: chain.chainName,
    specVersion: runtimeSpecVersion,
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

export const getLatestMetadataRpc = async (
  chainId: ChainId,
  blockHash?: string
): Promise<`0x${string}`> => {
  const stop = log.timer(`getLatestMetadataRpc(${chainId})`)
  try {
    const versions = await stateCall(
      chainId,
      "Metadata_metadata_versions",
      "Vec<u32>",
      [],
      blockHash as HexString,
      true
    )
    if (versions.err) versions.unwrap()

    const numVersions = versions.unwrap().toJSON() as number[]
    const latest = Math.max(...numVersions.filter((v) => v <= 15)) // 15 is the max Talisman supports for now
    const version = new TypeRegistry().createType("u32", latest)

    const maybeOpaqueMetadata = await stateCall(
      chainId,
      "Metadata_metadata_at_version",
      "OpaqueMetadata",
      [version],
      blockHash as HexString,
      true
    )

    if (maybeOpaqueMetadata.err) maybeOpaqueMetadata.unwrap()

    const opaqueMetadata = maybeOpaqueMetadata.unwrap()

    return metadataFromOpaque(opaqueMetadata)
  } catch (err) {
    // maybe the chain doesn't have metadata_versions or metadata_at_version runtime calls - ex: crust standalone
    // fetch metadata the old way
    if ((err as { message?: string })?.message?.includes("is not found"))
      return await getLegacyMetadataRpc(chainId, blockHash)

    // eslint-disable-next-line no-console
    console.error("getLatestMetadataRpc", { err })

    throw err
  } finally {
    stop()
  }
}

export const getLegacyMetadataRpc = async (
  chainId: ChainId,
  blockHash?: string
): Promise<`0x${string}`> => {
  return await chainConnector.send<HexString>(
    chainId,
    "state_getMetadata",
    [blockHash],
    !!blockHash
  )
}

const metadataFromOpaque = (opaque: OpaqueMetadata) => {
  try {
    // pjs codec for OpaqueMetadata doesn't allow us to decode the actual Metadata, find it ourselves
    const u8aBytes = opaque.toU8a()
    for (let i = 0; i < 20; i++) {
      // skip until we find the magic number that is used as prefix of metadata objects (usually in the first 10 bytes)
      if (u8aToNumber(u8aBytes.slice(i, i + 4)) !== 0x6174656d) continue

      const metadata = new TypeRegistry().createType("Metadata", u8aBytes.slice(i))

      return metadata.toHex()
    }
    throw new Error("Magic number not found")
  } catch (cause) {
    throw new Error("Failed to decode metadata from OpaqueMetadata", { cause })
  }
}
