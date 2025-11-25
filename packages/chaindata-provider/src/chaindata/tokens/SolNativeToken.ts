import z from "zod/v4"

import { SolNetworkId } from "../networks/SolNetwork"
import { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "sol-native"

export const SolNativeTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("solana"),
})
export type SolNativeToken = z.infer<typeof SolNativeTokenSchema>

export const SolNativeBalancesConfigSchema = z.strictObject({})

export type SolNativeBalancesConfig = z.infer<typeof SolNativeBalancesConfigSchema>

export type SolNativeTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: SolNetworkId
}

export const solNativeTokenId = (networkId: SolNetworkId) => generateTokenId(networkId, TOKEN_TYPE)

export const parseSolNativeTokenId = (tokenId: TokenId): SolNativeTokenIdSpecs => {
  const [networkId, type] = tokenId.split(":")
  if (!networkId || type !== TOKEN_TYPE) throw new Error(`Invalid SolNativeToken ID: ${tokenId}`)

  return { type, networkId }
}
