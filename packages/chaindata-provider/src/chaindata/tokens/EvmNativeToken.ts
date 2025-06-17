import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenId } from "./Token"
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

export type EvmNativeTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
}

export const evmNativeTokenId = (networkId: NetworkId) => generateTokenId(networkId, TOKEN_TYPE)

export const parseEvmNativeTokenId = (tokenId: TokenId): EvmNativeTokenIdSpecs => {
  const [networkId, type] = tokenId.split(":")
  if (!networkId || type !== TOKEN_TYPE) throw new Error(`Invalid EvmNativeToken ID: ${tokenId}`)

  return { type, networkId }
}
