import type { MetadataBuilder, MetadataLookup, UnifiedMetadata } from "@talismn/scale"
import type { SapiConnector } from "./getSapiConnector"
import type { ExtDef } from "./signedPayloadTypes"

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
