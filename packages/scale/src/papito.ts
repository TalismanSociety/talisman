import type { getDynamicBuilder } from "@polkadot-api/metadata-builders"

export {
  getDynamicBuilder,
  getLookupFn,
  type MetadataLookup,
} from "@polkadot-api/metadata-builders"
export type { Codec, UnifiedMetadata } from "@polkadot-api/substrate-bindings"
export {
  Binary,
  decAnyMetadata,
  FixedSizeBinary,
  metadata,
  unifyMetadata,
} from "@polkadot-api/substrate-bindings"
export { fromHex, mergeUint8, toHex } from "@polkadot-api/utils"

/** Constant: https://docs.substrate.io/build/application-development/#metadata-format */
export const magicNumber = 1635018093

export type MetadataBuilder = ReturnType<typeof getDynamicBuilder>
