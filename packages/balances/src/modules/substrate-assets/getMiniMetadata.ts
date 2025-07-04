import { AnyMiniMetadata, MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { compactMetadata, decAnyMetadata, encodeMetadata, unifyMetadata } from "@talismn/scale"
import { log } from "extension-shared"

import { deriveMiniMetadataId } from "../../types"
import { IBalanceModule } from "../IBalanceModule"
import { hasStorageItems } from "../shared/utils"
import { MODULE_TYPE } from "./config"
import { getConstantValue } from "./utils"

export const getMiniMetadata: IBalanceModule<typeof MODULE_TYPE>["getMiniMetadata"] = ({
  networkId,
  specVersion,
  metadataRpc,
}) => {
  const source = MODULE_TYPE
  const chainId = networkId

  const systemVersion = getConstantValue<{ spec_version: number }>(metadataRpc, "System", "Version")
  if (specVersion !== systemVersion.spec_version)
    log.warn("specVersion mismatch", { networkId, specVersion, systemVersion })

  const id = deriveMiniMetadataId({ source, chainId, specVersion })

  const metadata = decAnyMetadata(metadataRpc)
  const unifiedMetadata = unifyMetadata(metadata)

  if (unifiedMetadata.version < 14)
    throw new Error(
      `Unsupported metadata version: ${unifiedMetadata.version}. Minimum required is 14.`,
    )

  return {
    id,
    source,
    chainId,
    specVersion,
    version: MINIMETADATA_VERSION,
    data: getData(metadataRpc),
    extra: null,
  } as AnyMiniMetadata
}

const getData = (metadataRpc: string): `0x${string}` | null => {
  const metadata = decAnyMetadata(metadataRpc)
  const unifiedMetadata = unifyMetadata(metadata)

  // ensure the network has all the required bits
  if (!hasStorageItems(unifiedMetadata, "Assets", ["Account", "Asset", "Metadata"])) return null

  compactMetadata(metadata, [{ pallet: "Assets", items: ["Account", "Asset", "Metadata"] }])

  return encodeMetadata(metadata)
}
