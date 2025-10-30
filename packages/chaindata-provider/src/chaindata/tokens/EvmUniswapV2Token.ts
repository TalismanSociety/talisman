import z from "zod/v4"

import { NetworkId } from "../networks"
import { EthereumAddressSchema } from "../shared"
import { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "evm-uniswapv2"

export const EvmUniswapV2TokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("ethereum"),
  contractAddress: EthereumAddressSchema,
  isCustom: z.boolean().optional(),
  symbol0: z.string().nonempty(),
  symbol1: z.string().nonempty(),
  decimals0: z.int().min(0),
  decimals1: z.int().min(0),
  tokenAddress0: EthereumAddressSchema,
  tokenAddress1: EthereumAddressSchema,
  coingeckoId0: z.string().optional(),
  coingeckoId1: z.string().optional(),
})
export type EvmUniswapV2Token = z.infer<typeof EvmUniswapV2TokenSchema>

export const EvmUniswapV2BalancesConfigSchema = z.strictObject({})

export type EvmUniswapV2BalancesConfig = z.infer<typeof EvmUniswapV2BalancesConfigSchema>

export type EvmUniswapV2TokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  contractAddress: `0x${string}`
}

export const evmUniswapV2TokenId = (
  networkId: NetworkId,
  contractAddress: EvmUniswapV2Token["contractAddress"],
) => generateTokenId(networkId, TOKEN_TYPE, contractAddress.toLowerCase())

export const parseEvmUniswapV2TokenId = (tokenId: TokenId): EvmUniswapV2TokenIdSpecs => {
  const [networkId, type, contractAddress] = tokenId.split(":")
  if (!networkId || !contractAddress) throw new Error(`Invalid EvmUniswapV2Token ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid EvmUniswapV2Token type: ${type}`)

  return {
    type,
    networkId,
    contractAddress: EthereumAddressSchema.parse(contractAddress),
  }
}
