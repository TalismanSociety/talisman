import log from "../log"
import { MetadataBuilder, UnifiedMetadata } from "../papito"
import { parseMetadataRpc } from "./parseMetadataRpc"

export const getConstantValueFromMetadata = <T>(
  metadata: `0x${string}` | { builder: MetadataBuilder; unifiedMetadata: UnifiedMetadata },
  pallet: string,
  constant: string,
) => {
  const { builder, unifiedMetadata } =
    typeof metadata === "string" ? parseMetadataRpc(metadata) : metadata

  return getConstantValueInner<T>(builder, unifiedMetadata, pallet, constant)
}

const getConstantValueInner = <T>(
  builder: MetadataBuilder,
  unifiedMetadata: UnifiedMetadata,
  pallet: string,
  constant: string,
) => {
  try {
    const storageCodec = builder.buildConstant(pallet, constant)

    const encodedValue = unifiedMetadata.pallets
      .find(({ name }) => name === pallet)
      ?.constants.find(({ name }) => name === constant)?.value

    if (!encodedValue) throw new Error(`Constant ${pallet}.${constant} not found`)

    return storageCodec.dec(encodedValue) as T
  } catch (err) {
    log.error("Failed to get constant value from metadata", {
      err,
      pallet,
      constant,
    })
    throw err
  }
}
