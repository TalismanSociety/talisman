import { hexToU8a } from "@polkadot/util"
import { base64Encode } from "@polkadot/util-crypto"
import { HexString } from "@polkadot/util/types"

// these are stored as base64 for lower storage size
export const encodeMetadataRpc = (metadataRpc: HexString) => base64Encode(hexToU8a(metadataRpc))
