import { base64 } from "@talismn/crypto"
import { type HexString, hexToU8a, LruMap, u8aToHex } from "@talismn/util"

import type { TalismanMetadataDef } from "../substrate/types"

// metadata is stored as base64 for lower storage size

const decodedMetadataRpcs = new LruMap<string, HexString>(20)

export const decodeMetadataRpc = (encoded: string): HexString => {
  const cached = decodedMetadataRpcs.get(encoded)
  if (cached) return cached

  const metadataRpc = u8aToHex(base64.decode(encoded))
  decodedMetadataRpcs.set(encoded, metadataRpc)
  return metadataRpc
}

export const encodeMetadataRpc = (metadataRpc: `0x${string}`) =>
  base64.encode(hexToU8a(metadataRpc))

export const getMetadataRpcFromDef = (metadataDef?: TalismanMetadataDef) => {
  if (metadataDef?.metadataRpc) return decodeMetadataRpc(metadataDef.metadataRpc)
  return undefined
}
