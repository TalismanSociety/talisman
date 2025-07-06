import { MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { compactMetadata, encodeMetadata, parseMetadataRpc } from "@talismn/scale"
import { log } from "extension-shared"
import { Binary } from "polkadot-api"

import { deriveMiniMetadataId } from "../../types"
import { IBalanceModule } from "../IBalanceModule"
import { tryGetConstantValue } from "../shared"
import { getConstantValue } from "../shared/getContantValue"
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
    log.warn("specVersion mismatch", { networkId, specVersion, systemVersion })

  const id = deriveMiniMetadataId({ source, chainId, specVersion })

  const { metadata, unifiedMetadata } = parseMetadataRpc(metadataRpc)

  if (unifiedMetadata.version < 14)
    throw new Error(
      `Unsupported metadata version: ${unifiedMetadata.version}. Minimum required is 14.`,
    )

  if (config?.disable)
    return {
      id,
      source,
      chainId,
      specVersion,
      version: MINIMETADATA_VERSION,
      data: null,
      extra: { disable: true },
    }

  const existentialDeposit = tryGetConstantValue<bigint>(
    metadataRpc,
    "Balances",
    "ExistentialDeposit",
  )?.toString()
  const nominationPoolsPalletId = tryGetConstantValue<Binary>(
    metadataRpc,
    "NominationPools",
    "PalletId",
  )?.asText()
  const hasSubtensorPallet = !!tryGetConstantValue(metadataRpc, "SubtensorModule", "KeySwapCost")

  const hasFreezesItem = Boolean(
    unifiedMetadata.pallets
      .find(({ name }) => name === "Balances")
      ?.storage?.items.find(({ name }) => name === "Freezes"),
  )
  const useLegacyTransferableCalculation = !hasFreezesItem

  compactMetadata(
    metadata,
    [
      { pallet: "System", constants: ["Version", "SS58Prefix"], items: ["Account"] },
      { pallet: "Balances", items: ["Reserves", "Holds", "Locks", "Freezes"] },
      { pallet: "NominationPools", items: ["PoolMembers", "BondedPools", "Metadata"] },
      { pallet: "Staking", items: ["Ledger"] },
      // TotalColdkeyStake is used until v.2.2.1, then it is replaced by StakingHotkeys+Stake
      // Need to keep TotalColdkeyStake for a while so chaindata keeps including it in miniMetadatas, so it doesnt break old versions of the wallet
      // TODO: Since chaindata v4 this is safe to now delete
      { pallet: "SubtensorModule", items: ["TotalColdkeyStake", "StakingHotkeys", "Stake"] },
    ],
    [
      { runtimeApi: "StakeInfoRuntimeApi", methods: ["get_stake_info_for_coldkey"] },
      { runtimeApi: "SubnetInfoRuntimeApi", methods: ["get_dynamic_info"] },
    ],
  )

  return {
    id,
    source,
    chainId,
    specVersion,
    version: MINIMETADATA_VERSION,
    data: encodeMetadata(metadata),
    extra: {
      useLegacyTransferableCalculation,
      existentialDeposit,
      nominationPoolsPalletId,
      hasSubtensorPallet,
    },
  }
}
