import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { getDynamicBuilder, getLookupFn, V14, V15 } from "@talismn/scale"

import { SapiConnector } from "./getSapiConnector"

export type ScaleMetadata = V14 | V15
export type ScaleBuilder = ReturnType<typeof getDynamicBuilder>
export type ScaleLookup = ReturnType<typeof getLookupFn>

export type Chain = {
  connector: SapiConnector
  hexMetadata: `0x${string}`
  token: { symbol: string; decimals: number }
  hasCheckMetadataHash?: boolean
  signedExtensions?: ExtDef
  registryTypes?: unknown
  metadata: ScaleMetadata
  lookup: ScaleLookup
  builder: ScaleBuilder
}

export type ChainInfo = {
  specName: string
  specVersion: number
  transactionVersion: number
  base58Prefix: number
}
