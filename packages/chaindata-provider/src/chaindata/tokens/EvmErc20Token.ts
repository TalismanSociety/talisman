import z from "zod/v4"

import { EthereumAddressSchema } from "../shared"
import { TokenBase } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "evm-erc20"

export const EvmErc20TokenSchema = TokenBase.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("ethereum"),
  contractAddress: EthereumAddressSchema,
  isCustom: z.boolean().optional(),
})
export type EvmErc20Token = z.infer<typeof EvmErc20TokenSchema>

// TODO yeet => wallet only information
export const CustomErc20TokenSchema = EvmErc20TokenSchema.extend({
  isCustom: z.literal(true),
})

export type CustomEvmErc20Token = z.infer<typeof CustomErc20TokenSchema>

export const evmErc20TokenId = (networkId: string, contractAddress: `0x${string}`) =>
  generateTokenId(networkId, TOKEN_TYPE, contractAddress.toLowerCase())
