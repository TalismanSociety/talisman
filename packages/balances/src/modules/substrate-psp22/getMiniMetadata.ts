import { AnyMiniMetadata, MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"

import { deriveMiniMetadataId } from "../../types"
import { IBalanceModule } from "../../types/IBalanceModule"
import { getConstantValue } from "../shared"
import { MODULE_TYPE } from "./config"

export const getMiniMetadata: IBalanceModule<typeof MODULE_TYPE>["getMiniMetadata"] = ({
  networkId,
  specVersion,
  metadataRpc,
}) => {
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

  return {
    id,
    source,
    chainId,
    specVersion,
    version: MINIMETADATA_VERSION,
    data: null,
    extra: null,
  } as AnyMiniMetadata
}
