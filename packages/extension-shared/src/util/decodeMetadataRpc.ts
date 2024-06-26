import { u8aToHex } from "@polkadot/util"
import { base64Decode } from "@polkadot/util-crypto"

// these are stored as base64 for lower storage size
export const decodeMetadataRpc = (encoded: string) => u8aToHex(base64Decode(encoded))
