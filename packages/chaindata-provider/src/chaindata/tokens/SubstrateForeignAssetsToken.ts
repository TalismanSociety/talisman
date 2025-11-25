import LZString from "lz-string"
import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

export const TOKEN_TYPE = "substrate-foreignassets"

export const SubForeignAssetsTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  onChainId: z.string(),
  isFrozen: z.boolean().optional(),
  isSufficient: z.boolean(),
  existentialDeposit: z.string(),
})
export type SubForeignAssetsToken = z.infer<typeof SubForeignAssetsTokenSchema>

export const SubForeignAssetsBalancesConfigSchema = z.strictObject({})

export type SubForeignAssetsBalancesConfig = z.infer<typeof SubForeignAssetsBalancesConfigSchema>

export type ForeignAssetsTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  onChainId: string
}

export const subForeignAssetTokenId = (networkId: NetworkId, onChainId: string) =>
  generateTokenId(networkId, TOKEN_TYPE, LZString.compressToEncodedURIComponent(onChainId))

export const parseSubForeignAssetTokenId = (tokenId: TokenId): ForeignAssetsTokenIdSpecs => {
  const [networkId, type, onChainId] = tokenId.split(":")
  if (!networkId || !onChainId) throw new Error(`Invalid SubForeignAssetsToken ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid SubForeignAssetsToken type: ${type}`)

  return {
    type,
    networkId,
    onChainId: LZString.decompressFromEncodedURIComponent(onChainId) || "",
  }
}
