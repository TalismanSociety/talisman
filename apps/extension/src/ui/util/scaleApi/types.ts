import { getDynamicBuilder, getLookupFn, V14, V15 } from "@talismn/scale"

export type ScaleMetadata = V14 | V15
export type ScaleBuilder = ReturnType<typeof getDynamicBuilder>
export type ScaleLookup = ReturnType<typeof getLookupFn>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecodedCall<Args = any> = { pallet: string; method: string; args: Args }

export type PayloadSignerConfig = {
  address: string
  tip?: bigint
}
