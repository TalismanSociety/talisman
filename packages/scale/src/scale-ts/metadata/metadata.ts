import { v15 } from "@polkadot-api/substrate-bindings"
import { Codec, CodecType, Enum, Struct, createCodec, u32 } from "scale-ts"

import { v14 } from "./v14"

const unsupportedFn = () => {
  throw new Error("Unsupported metadata version!")
}

const unsupported = createCodec(unsupportedFn, unsupportedFn) as unknown as Codec<unknown>

/** Constant: https://docs.substrate.io/build/application-development/#metadata-format */
export const magicNumber = 1635018093

export const metadata = Struct({
  magicNumber: u32,
  metadata: Enum({
    v0: unsupported,
    v1: unsupported,
    v2: unsupported,
    v3: unsupported,
    v4: unsupported,
    v5: unsupported,
    v6: unsupported,
    v7: unsupported,
    v8: unsupported,
    v9: unsupported,
    v10: unsupported,
    v11: unsupported,
    v12: unsupported,
    v13: unsupported,
    v14,
    v15,
  }),
})
export type Metadata = CodecType<typeof metadata>
