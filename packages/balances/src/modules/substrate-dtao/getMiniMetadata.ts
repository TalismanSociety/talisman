import { type AnyMiniMetadata, MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { compactMetadata, encodeMetadata, parseMetadataRpc } from "@talismn/scale"

import { deriveMiniMetadataId } from "../../types"
import type { IBalanceModule } from "../../types/IBalanceModule"
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
      `specVersion mismatch: expected ${specVersion}, metadata got ${systemVersion.spec_version}`
    )

  const id = deriveMiniMetadataId({ source, chainId, specVersion })

  const { unifiedMetadata } = parseMetadataRpc(metadataRpc)

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
    data: getData(metadataRpc),
    extra: null,
  } as AnyMiniMetadata
}

const getData = (metadataRpc: `0x${string}`): `0x${string}` | null => {
  const { metadata, unifiedMetadata } = parseMetadataRpc(metadataRpc)

  const isBittensor = unifiedMetadata.pallets.some(({ name }) => name === "SubtensorModule")
  if (!isBittensor) return null

  compactMetadata(
    metadata,
    [
      {
        pallet: "SubtensorModule",
        items: [
          "TransferToggle",
          "Lock",
          "DecayingLock",
          "RootStakeUnlockInterval",
          "LastColdkeyHotkeyStakeBlock",
        ],
      },
      {
        // read alongside LastColdkeyHotkeyStakeBlock to age hold windows without a
        // chain_getHeader round trip
        pallet: "System",
        items: ["Number"],
      },
    ],
    [
      {
        runtimeApi: "StakeInfoRuntimeApi",
        methods: ["get_stake_info_for_coldkeys", "get_coldkey_lock"],
      },
      {
        runtimeApi: "SubnetInfoRuntimeApi",
        methods: ["get_all_dynamic_info"],
      },
      {
        runtimeApi: "BetaBasketRuntimeApi",
        methods: ["get_root_basket_positions"],
      },
    ]
  )

  return encodeMetadata(metadata)
}
