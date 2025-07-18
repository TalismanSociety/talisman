import { hexToU8a, u8aToHex } from "@polkadot/util"
import { base64Decode, base64Encode } from "@polkadot/util-crypto"

import { TalismanMetadataDef } from "../substrate/types"

// these are stored as base64 for lower storage size
export const decodeMetaCalls = (encoded: string) => base64Decode(encoded)

// these are stored as base64 for lower storage size
export const decodeMetadataRpc = (encoded: string) => u8aToHex(base64Decode(encoded))

// these are stored as base64 for lower storage size
export const encodeMetadataRpc = (metadataRpc: `0x${string}`) => base64Encode(hexToU8a(metadataRpc))

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

export const getMetadataRpcFromDef = (metadataDef?: TalismanMetadataDef) => {
  if (metadataDef?.metadataRpc) return decodeMetadataRpc(metadataDef.metadataRpc)
  return undefined
}
