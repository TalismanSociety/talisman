import { getDynamicBuilder, getLookupFn, V14, V15 } from "@talismn/scale"
import { ChainId } from "extension-core"

import { api } from "@ui/api"

type ScaleMetadata = V14 | V15
type ScaleBuilder = ReturnType<typeof getDynamicBuilder>
export type ScaleApi = ReturnType<typeof getScaleApi>

export const getScaleApi = (chainId: ChainId, metadata: ScaleMetadata) => {
  const lookup = getLookupFn(metadata)
  const builder = getDynamicBuilder(lookup)

  const { spec_name: specName, spec_version: specVersion } = getConstantValue<{
    spec_name: string
    spec_version: number
  }>(metadata, builder, "System", "Version")

  return {
    id: `${chainId}::${specName}::${specVersion}`,
    chainId,
    specName,
    specVersion,
    getConstant: <T>(pallet: string, constant: string) =>
      getConstantValue<T>(metadata, builder, pallet, constant),
    getStorage: <T>(pallet: string, method: string, keys: unknown[]) =>
      fetchStorageValue<T>(chainId, builder, pallet, method, keys),
  }
}

const getConstantValue = <T>(
  metadata: ScaleMetadata,
  scaleBuilder: ScaleBuilder,
  pallet: string,
  constant: string
) => {
  const storageCodec = scaleBuilder.buildConstant(pallet, constant)

  const encodedValue = metadata.pallets
    .find(({ name }) => name === pallet)
    ?.constants.find(({ name }) => name === constant)?.value

  if (!encodedValue) throw new Error(`Constant ${pallet}.${constant} not found`)

  return storageCodec.dec(encodedValue) as T
}

const fetchStorageValue = async <T>(
  chainId: ChainId,
  scaleBuilder: ScaleBuilder,
  pallet: string,
  method: string,
  keys: unknown[]
) => {
  const storageCodec = scaleBuilder.buildStorage(pallet, method)
  const stateKey = storageCodec.enc(...keys)

  const hexValue = await api.subSend<string | null>(chainId, "state_getStorage", [stateKey])
  if (!hexValue) return null

  return storageCodec.dec(hexValue) as T
}
