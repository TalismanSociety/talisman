export {
  getDynamicBuilder,
  getLookupFn,
  type MetadataLookup,
} from "@polkadot-api/metadata-builders"
export type { Codec, SizedHex, UnifiedMetadata } from "@polkadot-api/substrate-bindings"
export {
  Binary,
  decAnyMetadata,
  metadata,
  unifyMetadata,
} from "@polkadot-api/substrate-bindings"
export { fromHex, mergeUint8, toHex } from "@polkadot-api/utils"

/** Constant: https://docs.substrate.io/build/application-development/#metadata-format */
export const magicNumber = 1635018093

export type MetadataBuilder = ReturnType<
  typeof import("@polkadot-api/metadata-builders").getDynamicBuilder
>
