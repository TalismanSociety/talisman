import type { bittensor } from "@polkadot-api/descriptors"
import {
  AnyMiniMetadata,
  SubDTaoToken,
  subDTaoTokenId,
  SubDTaoTokenSchema,
} from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"

import { IBalanceModule } from "../../types/IBalanceModule"
import { fetchRuntimeCallResult } from "../shared"
import { DEFAULT_DTAO_LOGO, MODULE_TYPE, PLATFORM, TokenConfig } from "./config"

type GetDynamicInfosResult =
  (typeof bittensor)["descriptors"]["apis"]["SubnetInfoRuntimeApi"]["get_all_dynamic_info"][1]

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  connector,
  miniMetadata,
}) => {
  const anyMiniMetadata = miniMetadata as AnyMiniMetadata
  if (!anyMiniMetadata?.data) return []

  const dynamicInfos = await fetchRuntimeCallResult<GetDynamicInfosResult>(
    connector,
    networkId,
    anyMiniMetadata.data,
    "SubnetInfoRuntimeApi",
    "get_all_dynamic_info",
    [],
  )

  return dynamicInfos
    .filter(isNotNil)
    .map((info): SubDTaoToken => {
      const symbol = new TextDecoder().decode(Uint8Array.from(info.token_symbol))
      const subnetName =
        info.subnet_identity?.subnet_name?.asText() ??
        (info.netuid === 0 ? "Root" : `Subnet ${info.netuid}`)
      const name = `${info.netuid} | ${subnetName} ${symbol}`
      return {
        id: subDTaoTokenId(networkId, info.netuid),
        type: MODULE_TYPE,
        platform: PLATFORM,
        networkId,
        subnetId: info.netuid,
        isDefault: true,
        symbol,
        decimals: 9,
        logo: DEFAULT_DTAO_LOGO,
        name,
        subnetName,
      }
    })

    .filter((t) => {
      const parsed = SubDTaoTokenSchema.safeParse(t)
      return parsed.success
    })
}
