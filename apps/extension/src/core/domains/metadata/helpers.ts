import { base64 } from "@talismn/crypto"
import { type HexString, hexToU8a, u8aToHex } from "@talismn/util"

import type { TalismanMetadataDef } from "../substrate/types"

// metadata is stored as base64 for lower storage size

// a blob is ~1MB and every signature decodes the same one, so the last decode is kept
let lastDecoded: { encoded: string; metadataRpc: HexString } | undefined

export const decodeMetadataRpc = (encoded: string): HexString => {
  if (lastDecoded?.encoded === encoded) return lastDecoded.metadataRpc

  lastDecoded = { encoded, metadataRpc: u8aToHex(base64.decode(encoded)) }
  return lastDecoded.metadataRpc
}

export const encodeMetadataRpc = (metadataRpc: `0x${string}`) =>
  base64.encode(hexToU8a(metadataRpc))

export const getMetadataRpcFromDef = (metadataDef?: TalismanMetadataDef) => {
  if (metadataDef?.metadataRpc) return decodeMetadataRpc(metadataDef.metadataRpc)
  return undefined
}
