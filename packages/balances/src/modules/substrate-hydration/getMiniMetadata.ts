import { AnyMiniMetadata, MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { compactMetadata, decAnyMetadata, encodeMetadata, unifyMetadata } from "@talismn/scale"
import { log } from "extension-shared"

import { deriveMiniMetadataId } from "../../types"
import { IBalanceModule } from "../IBalanceModule"
import { MODULE_TYPE } from "./config"
import { getConstantValue } from "./utils"

export const getMiniMetadata: IBalanceModule<typeof MODULE_TYPE>["getMiniMetadata"] = ({
  networkId,
  specVersion,
  metadataRpc,
}) => {
  const source = MODULE_TYPE
  const chainId = networkId

  const systemVersion = getConstantValue<{ specVersion: number }>(metadataRpc, "System", "Version")
  if (specVersion !== systemVersion.specVersion)
    log.warn("specVersion mismatch", { networkId, specVersion, systemVersion })

  const id = deriveMiniMetadataId({ source, chainId, specVersion })

  const metadata = decAnyMetadata(metadataRpc)
  const unifiedMetadata = unifyMetadata(metadata)

  if (unifiedMetadata.version < 14)
    throw new Error(
      `Unsupported metadata version: ${unifiedMetadata.version}. Minimum required is 14.`,
    )

  compactMetadata(
    metadata,
    [
      { pallet: "AssetRegistry", items: ["Assets"] }, // token specs
      { pallet: "Tokens", items: ["Accounts"] }, // balances for tokens
    ],
    [
      {
        runtimeApi: "CurrenciesApi",
        methods: ["accounts"],
      },
    ],
  )

  const data = encodeMetadata(metadata)

  return {
    id,
    source,
    chainId,
    specVersion,
    version: MINIMETADATA_VERSION,
    data,
    extra: null,
  } as AnyMiniMetadata
}
