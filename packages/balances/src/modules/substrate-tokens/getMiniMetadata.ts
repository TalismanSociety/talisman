import { MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { compactMetadata, encodeMetadata, parseMetadataRpc } from "@talismn/scale"

import { deriveMiniMetadataId } from "../../types"
import { IBalanceModule } from "../../types/IBalanceModule"
import { getConstantValue, hasStorageItems } from "../shared"
import { MiniMetadataExtra, MODULE_TYPE, ModuleConfig, TokenConfig } from "./config"

export const getMiniMetadata: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig,
  MiniMetadataExtra
>["getMiniMetadata"] = ({ networkId, specVersion, metadataRpc, config }) => {
  const source = MODULE_TYPE
  const chainId = networkId

  const systemVersion = getConstantValue<{ spec_version: number }>(metadataRpc, "System", "Version")
  if (specVersion !== systemVersion.spec_version)
    throw new Error(
      `specVersion mismatch: expected ${specVersion}, metadata got ${systemVersion.spec_version}`,
    )

  const id = deriveMiniMetadataId({ source, chainId, specVersion })

  const { unifiedMetadata } = parseMetadataRpc(metadataRpc)

  if (unifiedMetadata.version < 14)
    throw new Error(
      `Unsupported metadata version: ${unifiedMetadata.version}. Minimum required is 14.`,
    )

  const extra: MiniMetadataExtra = { palletId: config?.palletId ?? "Tokens" }

  return {
    id,
    source,
    chainId,
    specVersion,
    version: MINIMETADATA_VERSION,
    data: getData(metadataRpc, extra.palletId),
    extra,
  }
}

const getData = (metadataRpc: `0x${string}`, pallet: string): `0x${string}` | null => {
  const { metadata, unifiedMetadata } = parseMetadataRpc(metadataRpc)

  // ensure the network has all the required bits
  if (!hasStorageItems(unifiedMetadata, pallet, ["Accounts"])) return null

  compactMetadata(metadata, [{ pallet, items: ["Accounts"] }])

  return encodeMetadata(metadata)
}
