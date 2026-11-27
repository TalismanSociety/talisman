import { type AnyMiniMetadata, MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"

import { deriveMiniMetadataId } from "../../types"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { getConstantValue } from "../shared"
import { compactGammaMetadata } from "./chain"
import { MODULE_TYPE } from "./config"

export const getMiniMetadata: IBalanceModule<typeof MODULE_TYPE>["getMiniMetadata"] = ({
  networkId,
  specVersion,
  metadataRpc,
}) => {
  const source = MODULE_TYPE
  const chainId = networkId

  const parsed = parseMetadataRpc(metadataRpc)

  const systemVersion = getConstantValue<{ spec_version: number }>(parsed, "System", "Version")
  if (specVersion !== systemVersion.spec_version)
    throw new Error(
      `specVersion mismatch: expected ${specVersion}, metadata got ${systemVersion.spec_version}`
    )

  if (parsed.unifiedMetadata.version < 14)
    throw new Error(
      `Unsupported metadata version: ${parsed.unifiedMetadata.version}. Minimum required is 14.`
    )

  return {
    id: deriveMiniMetadataId({ source, chainId, specVersion }),
    source,
    chainId,
    specVersion,
    version: MINIMETADATA_VERSION,
    data: compactGammaMetadata(parsed),
    extra: null,
  } as AnyMiniMetadata
}
