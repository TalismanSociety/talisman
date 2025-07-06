import { parseMetadataRpc } from "@talismn/scale"

export const tryGetConstantValue = <T>(
  metadataRpc: `0x${string}`,
  pallet: string,
  constant: string,
) => {
  const { unifiedMetadata, builder } = parseMetadataRpc(metadataRpc)

  const encodedValue = unifiedMetadata.pallets
    .find(({ name }) => name === pallet)
    ?.constants.find(({ name }) => name === constant)?.value

  if (!encodedValue) return null

  const codec = builder.buildConstant(pallet, constant)

  return codec.dec(encodedValue) as T
}
