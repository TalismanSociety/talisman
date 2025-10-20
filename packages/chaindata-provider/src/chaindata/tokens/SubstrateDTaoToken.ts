import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-dtao"

export const SubDTaoTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  // number when used with papi - uint32 in theory (on asset hubs) but astar implemented it to u128 which makes it incompatible with number type
  subnetId: z.number().int().positive(),
  // hotkey is set for tokens provisionned at runtime
  hotkey: z.string().optional(),
})
export type SubDTaoToken = z.infer<typeof SubDTaoTokenSchema>

export const SubDTaoBalancesConfigSchema = z.undefined()

export type SubDTaoBalancesConfig = z.infer<typeof SubDTaoBalancesConfigSchema>

export type SubDTaoTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  subnetId: number
  hotkey?: string
}

export const subDTaoTokenId = (networkId: NetworkId, subnetId: number, hotkey?: string) =>
  hotkey
    ? generateTokenId(networkId, TOKEN_TYPE, String(subnetId), hotkey)
    : generateTokenId(networkId, TOKEN_TYPE, String(subnetId))

export const parseSubDTaoTokenId = (tokenId: TokenId): SubDTaoTokenIdSpecs => {
  const [networkId, type, subnetId, hotkey] = tokenId.split(":")
  if (!networkId || !subnetId) throw new Error(`Invalid SubDTaoToken ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid SubDTaoToken type: ${type}`)

  return {
    type,
    networkId,
    subnetId: SubDTaoTokenSchema.shape.subnetId.parse(subnetId),
    hotkey,
  }
}
