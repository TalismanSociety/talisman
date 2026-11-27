import z from "zod/v4"

import type { NetworkId } from "../networks"
import type { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-gamma"

/**
 * One token per network and subnet. A deposit is a value of a balance, never a token,
 * so the id never carries a hotkey.
 */
export const SubGammaTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  netuid: z.number().int().nonnegative(),
  subnetName: z.string().optional(),
  isTransferable: z.boolean().default(false),
})
export type SubGammaToken = z.infer<typeof SubGammaTokenSchema>

export const SubGammaBalancesConfigSchema = z.strictObject({})

export type SubGammaBalancesConfig = z.infer<typeof SubGammaBalancesConfigSchema>

export type SubGammaTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  netuid: number
}

export const subGammaTokenId = (networkId: NetworkId, netuid: number) =>
  generateTokenId(networkId, TOKEN_TYPE, String(netuid))

export const parseSubGammaTokenId = (tokenId: TokenId): SubGammaTokenIdSpecs => {
  const [networkId, type, netuid] = tokenId.split(":")
  if (!networkId || !netuid) throw new Error(`Invalid SubGammaToken ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid SubGammaToken type: ${type}`)

  return {
    type,
    networkId,
    netuid: SubGammaTokenSchema.shape.netuid.parse(Number(netuid)),
  }
}
