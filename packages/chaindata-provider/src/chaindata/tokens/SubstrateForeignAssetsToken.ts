import LZString from "lz-string"
import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenBase } from "./TokenBase"
import { generateTokenId } from "./utils"

export const TOKEN_TYPE = "substrate-foreignassets"

export const SubForeignAssetsTokenSchema = TokenBase.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  onChainId: z.string(),
  isFrozen: z.boolean().optional(),
  existentialDeposit: z.string(),
})
export type SubForeignAssetsToken = z.infer<typeof SubForeignAssetsTokenSchema>

export const subForeignAssetTokenId = (networkId: NetworkId, onChainId: string) =>
  generateTokenId(networkId, TOKEN_TYPE, LZString.compressToEncodedURIComponent(onChainId))
