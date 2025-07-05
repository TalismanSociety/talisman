import { parseMetadataRpc } from "@talismn/scale"

export const getConstantValue = <T>(
  metadataRpc: `0x${string}`,
  pallet: string,
  constant: string,
) => {
  const { unifiedMetadata, builder } = parseMetadataRpc(metadataRpc)

  const codec = builder.buildConstant(pallet, constant)

  const encodedValue = unifiedMetadata.pallets
    .find(({ name }) => name === pallet)
    ?.constants.find(({ name }) => name === constant)?.value

  if (!encodedValue) throw new Error(`Constant ${pallet}.${constant} not found`)

  return codec.dec(encodedValue) as T
}
