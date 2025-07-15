import { parseMetadataRpc, UnifiedMetadata } from "@talismn/scale"

export const hasStorageItem = (
  metadata: UnifiedMetadata,
  palletName: string,
  itemName: string,
): boolean => {
  const pallet = metadata.pallets.find((p) => p.name === palletName)
  if (!pallet || !pallet.storage) return false
  return pallet.storage.items.some((item) => item.name === itemName)
}

export const hasStorageItems = (
  metadata: UnifiedMetadata,
  palletName: string,
  itemNames: string[],
): boolean => {
  const pallet = metadata.pallets.find((p) => p.name === palletName)
  if (!pallet || !pallet.storage) return false
  return itemNames.every((itemName) => pallet.storage?.items.some((item) => item.name === itemName))
}

export const hasRuntimeApi = (
  metadata: UnifiedMetadata,
  apiName: string,
  method: string,
): boolean => {
  const api = metadata.apis.find((api) => api.name === apiName)
  if (!api || !api.methods) return false
  return api.methods.some((m) => m.name === method)
}

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
