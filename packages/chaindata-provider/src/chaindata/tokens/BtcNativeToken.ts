import z from "zod/v4"

import type { BtcNetworkId } from "../networks/BtcNetwork"
import type { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "btc-native"

export const BtcNativeTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("bitcoin"),
})
export type BtcNativeToken = z.infer<typeof BtcNativeTokenSchema>

export const BtcNativeBalancesConfigSchema = z.strictObject({})

export type BtcNativeBalancesConfig = z.infer<typeof BtcNativeBalancesConfigSchema>

export type BtcNativeTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: BtcNetworkId
}

export const btcNativeTokenId = (networkId: BtcNetworkId) => generateTokenId(networkId, TOKEN_TYPE)

export const parseBtcNativeTokenId = (tokenId: TokenId): BtcNativeTokenIdSpecs => {
  const [networkId, type] = tokenId.split(":")
  if (!networkId || type !== TOKEN_TYPE) throw new Error(`Invalid BtcNativeToken ID: ${tokenId}`)

  return { type, networkId }
}
