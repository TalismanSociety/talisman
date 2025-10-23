import { AnyMiniMetadata, MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { compactMetadata, encodeMetadata, parseMetadataRpc } from "@talismn/scale"

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
    data: getData(metadataRpc),
    extra: null,
  } as AnyMiniMetadata
}

const getData = (metadataRpc: `0x${string}`): `0x${string}` | null => {
  const { metadata, unifiedMetadata } = parseMetadataRpc(metadataRpc)

  const isBittensor = unifiedMetadata.pallets.some(({ name }) => name === "SubtensorModule")
  if (!isBittensor) return null

  // if (!hasStorageItems(unifiedMetadata, "SubtensorModule", ["StakingHotkeys", "Stake"])) return null

  // if (!hasRuntimeApi(unifiedMetadata, "StakeInfoRuntimeApi", "get_stake_info_for_coldkey"))
  //   return null
  // if (!hasRuntimeApi(unifiedMetadata, "StakeInfoRuntimeApi", "get_all_metagraphs")) return null
  // if (!hasRuntimeApi(unifiedMetadata, "SubnetInfoRuntimeApi", "get_dynamic_info")) return null

  // ensure the network has all the required bits
  // if (!hasStorageItems(unifiedMetadata, "Assets", ["Account", "Asset", "Metadata"])) return null

  compactMetadata(
    metadata,
    [{ pallet: "SubtensorModule", items: ["StakingHotkeys", "Stake"] }],
    [
      {
        runtimeApi: "StakeInfoRuntimeApi",
        methods: [
          // "get_stake_info_for_coldkey",
          // "get_all_metagraphs",
          "get_stake_info_for_coldkeys",
        ],
      },
      {
        runtimeApi: "SubnetInfoRuntimeApi",
        methods: [
          // "get_dynamic_info",
          "get_all_dynamic_info",
        ],
      },
    ],
  )

  return encodeMetadata(metadata)
}
