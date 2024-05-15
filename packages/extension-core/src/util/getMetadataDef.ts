import { TypeRegistry } from "@polkadot/types"
import { OpaqueMetadata } from "@polkadot/types/interfaces"
import { assert, hexToU8a, isHex, u8aToHex, u8aToNumber } from "@polkadot/util"
import { base64Decode, base64Encode } from "@polkadot/util-crypto"
import { HexString } from "@polkadot/util/types"
import * as Sentry from "@sentry/browser"
import { ChainId } from "@talismn/chaindata-provider"
import { DEBUG } from "extension-shared"
import { log } from "extension-shared"

import { db } from "../db"
import { metadataUpdatesStore } from "../domains/metadata/metadataUpdates"
import { TalismanMetadataDef } from "../domains/substrate/types"
import { chainConnector } from "../rpcs/chain-connector"
import { chaindataProvider } from "../rpcs/chaindata"
import { getRuntimeVersion } from "./getRuntimeVersion"
import { stateCall } from "./stateCall"

const cache: Record<string, TalismanMetadataDef> = {}

const getCacheKey = (genesisHash: HexString, specVersion?: number) =>
  !specVersion || !genesisHash ? null : `${genesisHash}-${specVersion}`

// those are stored as base64 for lower storage size
const encodeMetadataRpc = (metadataRpc: HexString) => base64Encode(hexToU8a(metadataRpc))
const decodeMetadataRpc = (encoded: string) => u8aToHex(base64Decode(encoded))
const decodeMetaCalls = (encoded: string) => base64Decode(encoded)

/**
 *
 * @param metadata
 * @returns a value that can be used to initialize a TypeRegistry
 */
export const getMetadataFromDef = (metadata: TalismanMetadataDef) => {
  try {
    if (metadata.metadataRpc) return decodeMetadataRpc(metadata.metadataRpc)
    if (metadata.metaCalls) return decodeMetaCalls(metadata.metaCalls)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Could not decode metadata from store", { metadata })
  }
  return undefined
}

/**
 *
 * @param metadataDef
 * @returns Decoded metadataRpc which can be used to build transaction payloads
 */
export const getMetadataRpcFromDef = (metadataDef?: TalismanMetadataDef) => {
  if (metadataDef?.metadataRpc) return decodeMetadataRpc(metadataDef.metadataRpc)
  return undefined
}

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
  let genesisHash = isHex(chainIdOrHash) ? chainIdOrHash : null
  const chain = await (genesisHash
    ? chaindataProvider.chainByGenesisHash(genesisHash)
    : chaindataProvider.chainById(chainIdOrHash))
  if (!genesisHash) genesisHash = chain?.genesisHash as HexString

  // throw if neither a known chainId or genesisHash
  assert(genesisHash, `Unknown chain : ${chainIdOrHash}`)

  const cacheKey = getCacheKey(genesisHash, specVersion)
  if (cacheKey && cache[cacheKey]) return cache[cacheKey]

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
    log.warn(`Metadata for unknown isn't up to date`, storeMetadata?.chain ?? genesisHash)
    return storeMetadata
  }

  try {
    const { specVersion: runtimeSpecVersion } = await getRuntimeVersion(chain.id, blockHash)

    // if specVersion wasn't specified, but store version is up to date, look no further
    if (storeMetadata?.metadataRpc && runtimeSpecVersion === storeMetadata.specVersion)
      return storeMetadata

    // check cache using runtimeSpecVersion
    const cacheKey = getCacheKey(genesisHash, runtimeSpecVersion) as string
    if (cache[cacheKey]) return cache[cacheKey]

    // mark as updating in database (can be picked up by frontend via subscription)
    metadataUpdatesStore.set(genesisHash, true)

    // developer helpers to test all states, uncomment as needed
    // if (DEBUG) await sleep(5_000)
    // if (DEBUG) throw new Error("Failed to update metadata (debugging)")

    // fetch the metadata from the chain
    const [metadataRpc, chainProperties] = await Promise.all([
      getLatestMetadataRpc(chain.id, blockHash),
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

    assert(!specVersion || specVersion === runtimeSpecVersion, "specVersion mismatch")

    const newData = {
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

    // save in cache
    cache[cacheKey] = newData

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
    cache[cacheKey] = (await db.metadata.get(genesisHash)) as TalismanMetadataDef
    return cache[cacheKey]
  } catch (cause) {
    if ((cause as Error).message !== "RPC connect timeout reached") {
      // not a useful error, do not log to sentry
      const message = `Failed to update metadata for chain ${genesisHash}`
      const error = new Error(message, { cause })
      log.error(error)
      Sentry.captureException(error, { extra: { genesisHash } })
    }
    metadataUpdatesStore.set(genesisHash, false)
  }

  return storeMetadata
}

// useful for developer when testing updates
if (DEBUG) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).clearMetadata = () => {
    Object.keys(cache).forEach((key) => {
      delete cache[key]
    })
    db.metadata.clear()
  }
}

const getLatestMetadataRpc = async (chainId: ChainId, blockHash?: string) => {
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
      return chainConnector.send<HexString>(chainId, "state_getMetadata", [blockHash], !!blockHash)

    // eslint-disable-next-line no-console
    console.error("getLatestMetadataRpc", { err })

    throw err
  } finally {
    stop()
  }
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
