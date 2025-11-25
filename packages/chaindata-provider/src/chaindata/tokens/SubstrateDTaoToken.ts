import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-dtao"

export const SubDTaoTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  netuid: z.number().int(),
  subnetName: z.string().optional(),

  // hotkey is set only for dynamic tokens (provisionned at runtime)
  hotkey: z.string().optional(),
  isTransferable: z.boolean().default(true),
})
export type SubDTaoToken = z.infer<typeof SubDTaoTokenSchema>

export const SubDTaoBalancesConfigSchema = z.strictObject({})

export type SubDTaoBalancesConfig = z.infer<typeof SubDTaoBalancesConfigSchema>

export type SubDTaoTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  netuid: number
  hotkey?: string
}

export const subDTaoTokenId = (networkId: NetworkId, subnetId: number, hotkey?: string) =>
  hotkey
    ? generateTokenId(networkId, TOKEN_TYPE, String(subnetId), hotkey)
    : generateTokenId(networkId, TOKEN_TYPE, String(subnetId))

export const parseSubDTaoTokenId = (tokenId: TokenId): SubDTaoTokenIdSpecs => {
  const [networkId, type, netuid, hotkey] = tokenId.split(":")
  if (!networkId || !netuid) throw new Error(`Invalid SubDTaoToken ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid SubDTaoToken type: ${type}`)

  return {
    type,
    networkId,
    netuid: SubDTaoTokenSchema.shape.netuid.parse(Number(netuid)),
    hotkey,
  }
}
