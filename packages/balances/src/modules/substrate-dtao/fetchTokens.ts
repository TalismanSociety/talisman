import type { bittensor } from "@polkadot-api/descriptors"
import { IChainConnectorDot } from "@talismn/chain-connectors"
import {
  AnyMiniMetadata,
  DotNetworkId,
  SubDTaoToken,
  subDTaoTokenId,
  SubDTaoTokenSchema,
} from "@talismn/chaindata-provider"
import { getStorageKeyPrefix, parseMetadataRpc } from "@talismn/scale"
import { isNotNil } from "@talismn/util"
import { fromPairs } from "lodash-es"

import { IBalanceModule } from "../../types/IBalanceModule"
import { fetchRuntimeCallResult, QueryStorageResult } from "../shared"
import { MODULE_TYPE, PLATFORM, TokenConfig } from "./config"

type GetDynamicInfosResult =
  (typeof bittensor)["descriptors"]["apis"]["SubnetInfoRuntimeApi"]["get_all_dynamic_info"][1]

// hardcoded because we dont have access to native tokens from the balance module
const NATIVE_TOKEN_SYMBOLS: Record<string, string> = {
  "bittensor": "TAO",
  "bittensor-testnet": "testTAO",
}

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  connector,
  tokens,
  miniMetadata,
}) => {
  const anyMiniMetadata = miniMetadata as AnyMiniMetadata
  if (!anyMiniMetadata?.data) return []

  const [transferableTokensMap, dynamicInfos] = await Promise.all([
    fetchTransferableTokensMap(connector, anyMiniMetadata.data, networkId),
    fetchRuntimeCallResult<GetDynamicInfosResult>(
      connector,
      networkId,
      anyMiniMetadata.data,
      "SubnetInfoRuntimeApi",
      "get_all_dynamic_info",
      [],
    ),
  ])

  return dynamicInfos
    .filter(isNotNil)
    .map((info): SubDTaoToken => {
      const config = tokens.find((t) => t.netuid === info.netuid)

      let symbol = new TextDecoder().decode(Uint8Array.from(info.token_symbol))
      const subnetName =
        info.subnet_identity?.subnet_name?.asText() ??
        (info.netuid === 0 ? "Root" : `Subnet ${info.netuid}`)
      const name = `SN${info.netuid} | ${subnetName} ${symbol}`

      // for root we want same symbol as native so they can be grouped together in portfolio
      if (info.netuid === 0 && NATIVE_TOKEN_SYMBOLS[networkId])
        symbol = NATIVE_TOKEN_SYMBOLS[networkId]

      // if not stage in storage, consider transferable
      const isTransferable = transferableTokensMap[info.netuid] ?? true

      const token: SubDTaoToken = {
        id: subDTaoTokenId(networkId, info.netuid),
        type: MODULE_TYPE,
        platform: PLATFORM,
        networkId,
        netuid: info.netuid,
        isDefault: true,
        symbol,
        decimals: 9,
        name,
        subnetName,
        isTransferable,
      }

      return Object.assign({}, token, config)
    })

    .filter((t) => {
      const parsed = SubDTaoTokenSchema.safeParse(t)
      return parsed.success
    })
}

const fetchTransferableTokensMap = async (
  connector: IChainConnectorDot,
  metadata: `0x${string}`,
  networkId: DotNetworkId,
) => {
  const { builder } = parseMetadataRpc(metadata)
  const transferToggleCodec = builder.buildStorage("SubtensorModule", "TransferToggle")

  const transferToggleKeys = await connector.send<`0x${string}`[]>(networkId, "state_getKeys", [
    getStorageKeyPrefix("SubtensorModule", "TransferToggle"),
  ])

  const transferToggleResults = await connector.send<QueryStorageResult>(
    networkId,
    "state_queryStorageAt",
    [transferToggleKeys],
  )

  const transferToggleEntries = transferToggleResults.length ? transferToggleResults[0].changes : []

  return fromPairs(
    transferToggleEntries.map(([key, value]) => {
      const [netuid] = transferToggleCodec.keys.dec(key) as [number]
      const isTransferable = transferToggleCodec.value.dec(value) as boolean
      return [netuid, isTransferable]
    }),
  )
}
