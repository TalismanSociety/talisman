import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-assets"

export const SubAssetsTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  // number when used with papi - uint32 in theory (on asset hubs) but astar implemented it to u128 which makes it incompatible with number type
  assetId: z.union([z.uint32(), z.string()]).transform(String),
  isFrozen: z.boolean().optional(),
  isSufficient: z.boolean(),
  existentialDeposit: z.string(),
})
export type SubAssetsToken = z.infer<typeof SubAssetsTokenSchema>

export const SubAssetsBalancesConfigSchema = z.strictObject({})

export type SubAssetsBalancesConfig = z.infer<typeof SubAssetsBalancesConfigSchema>

export type SubAssetTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  assetId: string
}

export const subAssetTokenId = (networkId: NetworkId, assetId: string) =>
  generateTokenId(networkId, TOKEN_TYPE, assetId)

export const parseSubAssetTokenId = (tokenId: TokenId): SubAssetTokenIdSpecs => {
  const [networkId, type, assetId] = tokenId.split(":")
  if (!networkId || !assetId) throw new Error(`Invalid SubAssetsToken ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid SubAssetsToken type: ${type}`)

  return {
    type,
    networkId,
    assetId: SubAssetsTokenSchema.shape.assetId.parse(assetId),
  }
}
