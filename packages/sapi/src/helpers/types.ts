import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { getDynamicBuilder, getLookupFn, UnifiedMetadata } from "@talismn/scale"

import { SapiConnector } from "./getSapiConnector"

export type ScaleBuilder = ReturnType<typeof getDynamicBuilder>
export type ScaleLookup = ReturnType<typeof getLookupFn>

export type Chain = {
  connector: SapiConnector
  hexMetadata: `0x${string}`
  token: { symbol: string; decimals: number }
  hasCheckMetadataHash?: boolean
  signedExtensions?: ExtDef
  registryTypes?: unknown
  metadata: UnifiedMetadata
  lookup: ScaleLookup
  builder: ScaleBuilder
  metadataRpc: `0x${string}`
}

export type ChainInfo = {
  specName: string
  specVersion: number
  transactionVersion: number
  base58Prefix: number
}
