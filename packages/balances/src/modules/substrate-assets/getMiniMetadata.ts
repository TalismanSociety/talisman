import { type AnyMiniMetadata, MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { compactMetadata, encodeMetadata, parseMetadataRpc } from "@talismn/scale"

import { deriveMiniMetadataId } from "../../types"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { getConstantValue, hasStorageItems } from "../shared"
import { MODULE_TYPE } from "./config"

export const getMiniMetadata: IBalanceModule<typeof MODULE_TYPE>["getMiniMetadata"] = ({
  networkId,
  specVersion,
  metadataRpc,
}) => {
  const source = MODULE_TYPE
  const chainId = networkId

  const parsed = parseMetadataRpc(metadataRpc)
  const { unifiedMetadata } = parsed

  const systemVersion = getConstantValue<{ spec_version: number }>(parsed, "System", "Version")
  if (specVersion !== systemVersion.spec_version)
    throw new Error(
      `specVersion mismatch: expected ${specVersion}, metadata got ${systemVersion.spec_version}`
    )

  const id = deriveMiniMetadataId({ source, chainId, specVersion })

  if (unifiedMetadata.version < 14)
    throw new Error(
      `Unsupported metadata version: ${unifiedMetadata.version}. Minimum required is 14.`
    )

  return {
    id,
    source,
    chainId,
    specVersion,
    version: MINIMETADATA_VERSION,
    data: getData(parsed),
    extra: null,
  } as AnyMiniMetadata
}

const getData = ({
  metadata,
  unifiedMetadata,
}: ReturnType<typeof parseMetadataRpc>): `0x${string}` | null => {
  // ensure the network has all the required bits
  if (!hasStorageItems(unifiedMetadata, "Assets", ["Account", "Asset", "Metadata"])) return null

  compactMetadata(metadata, [{ pallet: "Assets", items: ["Account", "Asset", "Metadata"] }])

  return encodeMetadata(metadata)
}
