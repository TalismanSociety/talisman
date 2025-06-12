import z from "zod/v4"

import { TokenBase } from "./TokenBase"

export const SubAssetsTokenDef = TokenBase.extend({
  type: z.literal("substrate-assets"),
  platform: z.literal("polkadot"),
  assetId: z.string(),
  isFrozen: z.boolean().optional(),
  existentialDeposit: z.string(),
})
export type SubAssetsToken = z.infer<typeof SubAssetsTokenDef>

// import { ChainId } from "../Chain"
// import { NewTokenType } from "./types"

// type ModuleType = "substrate-assets"

// export type SubAssetsToken = NewTokenType<
//   ModuleType,
//   {
//     existentialDeposit: string
//     assetId: string
//     isFrozen: boolean
//     chain: { id: ChainId }
//   }
// >
