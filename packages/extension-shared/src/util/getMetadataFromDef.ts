import { TalismanMetadataDef } from "../domains/substrate/types"
import { decodeMetaCalls } from "./decodeMetaCalls"
import { decodeMetadataRpc } from "./decodeMetadataRpc"

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
