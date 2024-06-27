import { base64Decode } from "@polkadot/util-crypto"

// these are stored as base64 for lower storage size
export const decodeMetaCalls = (encoded: string) => base64Decode(encoded)
