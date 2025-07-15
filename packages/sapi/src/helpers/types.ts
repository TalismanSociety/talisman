import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { MetadataBuilder, MetadataLookup, UnifiedMetadata } from "@talismn/scale"

import { SapiConnector } from "./getSapiConnector"

export type Chain = {
  connector: SapiConnector
  hexMetadata: `0x${string}`
  token: { symbol: string; decimals: number }
  hasCheckMetadataHash?: boolean
  signedExtensions?: ExtDef
  registryTypes?: unknown
  metadata: UnifiedMetadata
  lookup: MetadataLookup
  builder: MetadataBuilder
  metadataRpc: `0x${string}`
}

export type ChainInfo = {
  specName: string
  specVersion: number
  transactionVersion: number
  base58Prefix: number
}
