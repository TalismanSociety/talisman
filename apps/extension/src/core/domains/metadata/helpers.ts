import { base64 } from "@talismn/crypto"
import { hexToU8a, u8aToHex } from "@talismn/util"

import type { TalismanMetadataDef } from "../substrate/types"

// these are stored as base64 for lower storage size

// these are stored as base64 for lower storage size
export const decodeMetadataRpc = (encoded: string) => u8aToHex(base64.decode(encoded))

// these are stored as base64 for lower storage size
export const encodeMetadataRpc = (metadataRpc: `0x${string}`) =>
  base64.encode(hexToU8a(metadataRpc))

export const getMetadataRpcFromDef = (metadataDef?: TalismanMetadataDef) => {
  if (metadataDef?.metadataRpc) return decodeMetadataRpc(metadataDef.metadataRpc)
  return undefined
}
