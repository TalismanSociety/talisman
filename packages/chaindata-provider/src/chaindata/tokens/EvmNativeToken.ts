import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenBase } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "evm-native"

export const EvmNativeTokenSchema = TokenBase.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("ethereum"),
})
export type EvmNativeToken = z.infer<typeof EvmNativeTokenSchema>

// TODO yeet => wallet only information
export const CustomEvmNativeTokenSchema = EvmNativeTokenSchema.extend({
  isCustom: z.literal(true),
})
export type CustomEvmNativeToken = z.infer<typeof CustomEvmNativeTokenSchema>

export const evmNativeTokenId = (networkId: NetworkId) => generateTokenId(networkId, TOKEN_TYPE)
