import { ChainConnector } from "@talismn/chain-connector"
import z from "zod/v4"

const DotNetworkPropertiesSimple = z.object({
  tokenDecimals: z.number().optional().default(0),
  tokenSymbol: z.string().optional().default("Unit"),
})

const DotNetworkPropertiesArray = z.object({
  tokenDecimals: z.array(z.number()).nonempty(),
  tokenSymbol: z.array(z.string()).nonempty(),
})

export const DotNetworkProperties = z
  .union([DotNetworkPropertiesSimple, DotNetworkPropertiesArray])
  .transform((val) => ({
    tokenDecimals: Array.isArray(val.tokenDecimals) ? val.tokenDecimals[0] : val.tokenDecimals,
    tokenSymbol: Array.isArray(val.tokenSymbol) ? val.tokenSymbol[0] : val.tokenSymbol,
  }))

export const getChainProperties = async (chainConnector: ChainConnector, networkId: string) => {
  const properties = await chainConnector.send(networkId, "system_properties", [], true)
  return DotNetworkProperties.parse(properties)
}
