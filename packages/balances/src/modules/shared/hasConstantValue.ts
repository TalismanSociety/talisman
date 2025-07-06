import { parseMetadataRpc } from "@talismn/scale"

export const hasConstantValue = (metadataRpc: `0x${string}`, pallet: string, constant: string) => {
  const { unifiedMetadata } = parseMetadataRpc(metadataRpc)

  return unifiedMetadata.pallets.find(
    ({ name, constants }) => name === pallet && constants.some(({ name }) => name === constant),
  )
}
