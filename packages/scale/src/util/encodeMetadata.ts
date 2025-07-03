import { Metadata } from "@polkadot-api/substrate-bindings"

import { metadata as scaleMetadata, toHex } from "../papito"

export const encodeMetadata = (metadata: Metadata) =>
  toHex(scaleMetadata.enc(metadata)) as `0x${string}`
