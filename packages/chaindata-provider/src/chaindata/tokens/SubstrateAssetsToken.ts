import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenId } from "./Token"
import { TokenBase } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-assets"

export const SubAssetsTokenSchema = TokenBase.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  assetId: z.string(),
  isFrozen: z.boolean().optional(),
  existentialDeposit: z.string(),
})
export type SubAssetsToken = z.infer<typeof SubAssetsTokenSchema>

export type SubAssetTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  assetId: number
}

export const subAssetTokenId = (networkId: NetworkId, assetId: string | number) =>
  generateTokenId(networkId, TOKEN_TYPE, String(assetId))

export const parseSubAssetTokenId = (tokenId: TokenId): SubAssetTokenIdSpecs => {
  const [networkId, type, assetId] = tokenId.split(":")
  if (!networkId || !assetId) throw new Error(`Invalid SubAssetsToken ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid SubAssetsToken type: ${type}`)

  return {
    type,
    networkId,
    assetId: z.uint32().parse(assetId),
  }
}
