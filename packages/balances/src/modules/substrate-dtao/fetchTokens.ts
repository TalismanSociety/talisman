import {
  AnyMiniMetadata,
  SubDTaoToken,
  subDTaoTokenId,
  SubDTaoTokenSchema,
} from "@talismn/chaindata-provider"
import { Binary } from "polkadot-api"

import { IBalanceModule } from "../../types/IBalanceModule"
import { fetchRuntimeCallResult } from "../shared"
import { DEFAULT_DTAO_LOGO, MODULE_TYPE, PLATFORM, TokenConfig } from "./config"

type DynamicInfo = {
  netuid: number
  subnet_identity?: {
    subnet_name?: Binary
  }
}

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  connector,
  miniMetadata,
}) => {
  const anyMiniMetadata = miniMetadata as AnyMiniMetadata
  if (!anyMiniMetadata?.data) return []

  const dynamicInfos: DynamicInfo[] = await fetchRuntimeCallResult(
    connector,
    networkId,
    anyMiniMetadata.data,
    "SubnetInfoRuntimeApi",
    "get_all_dynamic_info",
    [],
  )

  return dynamicInfos
    .filter((info) => !!info.netuid)
    .map(
      (info): SubDTaoToken => ({
        id: subDTaoTokenId(networkId, info.netuid),
        type: MODULE_TYPE,
        platform: PLATFORM,
        networkId,
        subnetId: info.netuid,
        isDefault: true,
        symbol: "dTAO",
        decimals: 9,
        logo: DEFAULT_DTAO_LOGO,
        name: info.subnet_identity?.subnet_name?.asText() || `Subnet ${info.netuid}`,
      }),
    )
    .filter((t) => {
      const parsed = SubDTaoTokenSchema.safeParse(t)
      return parsed.success
    })
}
