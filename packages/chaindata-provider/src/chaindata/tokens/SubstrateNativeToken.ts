import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-native"

export const SubNativeTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  existentialDeposit: z.string(),
})
export type SubNativeToken = z.infer<typeof SubNativeTokenSchema>

export const SubNativeBalancesConfigSchema = z.object({
  disable: z.boolean().optional(),
})

export type SubNativeBalancesConfig = z.infer<typeof SubNativeBalancesConfigSchema>

export type SubNativeTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
}

export const subNativeTokenId = (networkId: NetworkId) => generateTokenId(networkId, TOKEN_TYPE)

export const parseSubNativeTokenId = (tokenId: TokenId): SubNativeTokenIdSpecs => {
  const [networkId, type] = tokenId.split(":")
  if (!networkId || type !== TOKEN_TYPE) throw new Error(`Invalid SubNativeToken ID: ${tokenId}`)

  return { type, networkId }
}
