import z from "zod/v4"

import { NetworkId } from "../networks"
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

export const subAssetTokenId = (networkId: NetworkId, assetId: string | number) =>
  generateTokenId(networkId, TOKEN_TYPE, String(assetId))
