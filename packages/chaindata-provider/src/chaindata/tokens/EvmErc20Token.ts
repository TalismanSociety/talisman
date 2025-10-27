import z from "zod/v4"

import { NetworkId } from "../networks"
import { EthereumAddressSchema } from "../shared"
import { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "evm-erc20"

export const EvmErc20TokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("ethereum"),
  contractAddress: EthereumAddressSchema,
})
export type EvmErc20Token = z.infer<typeof EvmErc20TokenSchema>

export const EvmErc20BalancesConfigSchema = z.strictObject({})

export type EvmErc20BalancesConfig = z.infer<typeof EvmErc20BalancesConfigSchema>

export type EvmErc20TokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  contractAddress: `0x${string}`
}

export const evmErc20TokenId = (networkId: string, contractAddress: `0x${string}`) =>
  generateTokenId(networkId, TOKEN_TYPE, contractAddress.toLowerCase())

export const parseEvmErc20TokenId = (tokenId: TokenId): EvmErc20TokenIdSpecs => {
  const [networkId, type, contractAddress] = tokenId.split(":")
  if (!networkId || !contractAddress) throw new Error(`Invalid EvmErc20Token ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid EvmErc20Token type: ${type}`)

  return {
    type,
    networkId,
    contractAddress: EthereumAddressSchema.parse(contractAddress),
  }
}
