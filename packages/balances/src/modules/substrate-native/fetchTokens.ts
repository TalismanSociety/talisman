import { IChainConnectorDot } from "@talismn/chain-connectors"
import { SubNativeToken, subNativeTokenId, SubNativeTokenSchema } from "@talismn/chaindata-provider"
import { assign } from "lodash-es"
import z from "zod/v4"

import log from "../../log"
import { IBalanceModule } from "../../types/IBalanceModule"
import { MiniMetadataExtra, MODULE_TYPE, ModuleConfig, TokenConfig } from "./config"

export const fetchTokens: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig,
  MiniMetadataExtra
>["fetchTokens"] = async ({ networkId, tokens, connector, miniMetadata }) => {
  if (miniMetadata.extra.disable) return []

  const { tokenSymbol: symbol, tokenDecimals: decimals } = await getChainProperties(
    connector,
    networkId,
  )

  if (!miniMetadata.extra.existentialDeposit)
    log.warn(`Substrate native module: existentialDeposit is undefined for ${networkId}, using 0`)

  const tokenConfig: TokenConfig | undefined = tokens[0]

  const nativeToken: SubNativeToken = {
    id: subNativeTokenId(networkId),
    type: "substrate-native",
    platform: "polkadot",
    networkId,
    isDefault: true,
    symbol: symbol,
    name: symbol,
    decimals: decimals,
    existentialDeposit: miniMetadata.extra.existentialDeposit ?? "0",
  }

  const token = assign(nativeToken, tokenConfig)

  const parsed = SubNativeTokenSchema.safeParse(token)
  if (!parsed.success) {
    // log.warn(`Ignoring invalid token ${MODULE_TYPE}`, token, parsed.error)
    return []
  }

  return [parsed.data]
}

const DotNetworkPropertiesSimple = z.object({
  tokenDecimals: z.number().optional().default(0),
  tokenSymbol: z.string().optional().default("Unit"),
})

const DotNetworkPropertiesArray = z.object({
  tokenDecimals: z.array(z.number()).nonempty(),
  tokenSymbol: z.array(z.string()).nonempty(),
})

const DotNetworkPropertiesSchema = z
  .union([DotNetworkPropertiesSimple, DotNetworkPropertiesArray])
  .transform((val) => ({
    tokenDecimals: Array.isArray(val.tokenDecimals) ? val.tokenDecimals[0] : val.tokenDecimals,
    tokenSymbol: Array.isArray(val.tokenSymbol) ? val.tokenSymbol[0] : val.tokenSymbol,
  }))

export const getChainProperties = async (connector: IChainConnectorDot, networkId: string) => {
  const properties = await connector.send(networkId, "system_properties", [], true)
  return DotNetworkPropertiesSchema.parse(properties)
}
