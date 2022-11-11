/* eslint-disable no-console */
import { DEBUG } from "@core/constants"
import {
  getMetadataDef,
  getMetadataFromDef,
  getMetadataRpcFromDef,
} from "@core/util/getMetadataDef"
import { Metadata, TypeRegistry } from "@polkadot/types"
import { hexToNumber } from "@polkadot/util"
import * as Sentry from "@sentry/browser"

// metadata may have been added manually to the store, for a chain that Talisman doesn't know about (not in chaindata)
// => use either chainId or genesisHash as identifier

/**
 *
 * @param chainIdOrHash chainId or genesisHash
 * @param specVersion specVersion of the metadata to be loaded (if not defined, will fetch latest)
 * @param blockHash if specVersion isn't specified, this is the blockHash where to fetch the correct metadata from (if not defined, will fetch latest)
 * @param signedExtensions signedExtensions from a transaction payload that has to be decoded or signed
 * @returns substrate type registry
 */
export const getTypeRegistry = async (
  chainIdOrHash: string,
  specVersion?: number | string,
  blockHash?: string,
  signedExtensions?: string[]
) => {
  const key = `getTypeRegistry ${specVersion} ${Date.now()}`
  DEBUG && console.time(key)

  const registry = new TypeRegistry()

  const numSpecVersion = typeof specVersion === "string" ? hexToNumber(specVersion) : specVersion
  const metadataDef = await getMetadataDef(chainIdOrHash, numSpecVersion, blockHash)
  const metadataRpc = metadataDef ? getMetadataRpcFromDef(metadataDef) : undefined

  if (metadataDef) {
    try {
      const metadata: Metadata = new Metadata(registry, getMetadataFromDef(metadataDef))
      registry.setMetadata(metadata, signedExtensions, metadataDef.userExtensions)
      if (metadataDef.types) registry.register(metadataDef.types)
    } catch (err) {
      console.error("Invalid metadata for chain %s", chainIdOrHash)
      Sentry.captureException(err)
    }
  } else {
    console.warn("No metadata for chain %s", chainIdOrHash)
  }

  DEBUG && console.timeEnd(key)

  return { registry, metadataRpc }
}
