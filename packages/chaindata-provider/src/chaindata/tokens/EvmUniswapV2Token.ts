import z from "zod/v4"

import { NetworkId } from "../networks"
import { EthereumAddressSchema } from "../shared"
import { EvmErc20TokenSchema } from "./EvmErc20Token"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "evm-uniswapv2"

export const EvmUniswapV2TokenSchema = EvmErc20TokenSchema.extend({
  type: z.literal(TOKEN_TYPE),
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

// TODO yeet => wallet only information
export const CustomEvmUniswapV2TokenSchema = EvmUniswapV2TokenSchema.extend({
  isCustom: z.literal(true),
})

export type CustomEvmUniswapV2Token = z.infer<typeof CustomEvmUniswapV2TokenSchema>

export const evmUniswapV2TokenId = (
  networkId: NetworkId,
  contractAddress: EvmUniswapV2Token["contractAddress"],
) => generateTokenId(networkId, TOKEN_TYPE, contractAddress.toLowerCase())
