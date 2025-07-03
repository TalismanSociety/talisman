import { deriveMiniMetadataId } from "@talismn/balances"
import { AnyMiniMetadata } from "@talismn/chaindata-provider"
import { compactMetadata, decAnyMetadata, encodeMetadata, unifyMetadata } from "@talismn/scale"
import { log } from "extension-shared"

import { IBalanceModule } from "../IBalanceModule"
import { getConstantValue } from "./utils"

export const getMiniMetadata: IBalanceModule<"substrate-hydration">["getMiniMetadata"] = ({
  networkId,
  specVersion,
  metadataRpc,
}) => {
  const source = "substrate-hydration"
  const chainId = networkId

  const systemVersion = getConstantValue<{ specVersion: number }>(metadataRpc, "System", "Version")
  if (specVersion !== systemVersion.specVersion)
    log.warn("specVersion mismatch", { networkId, specVersion, systemVersion })

  const id = deriveMiniMetadataId({
    source: "substrate-hydration",
    chainId: networkId,
    specVersion,
    libVersion: "0.0.0",
  })

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
    libVersion: "0.0.0",
    data,
    extra: null,
  } as AnyMiniMetadata
}
