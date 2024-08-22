import { u8aToHex } from "@polkadot/util"
import { base64Decode } from "@polkadot/util-crypto"

// TODO try this instead // Buffer.from(metadataDef.metadataRpc, "base64").toString("hex")
//export const decodeMetadataRpc = (encoded: string) => Buffer.from(metadataDef.metadataRpc, "base64").toString("hex")

// these are stored as base64 for lower storage size
export const decodeMetadataRpc = (encoded: string) => u8aToHex(base64Decode(encoded))
