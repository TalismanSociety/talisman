import z from "zod/v4"

import { TokenBase } from "./TokenBase"

export const SubNativeTokenDef = TokenBase.extend({
  type: z.literal("substrate-native"),
  platform: z.literal("polkadot"),
  existentialDeposit: z.string(),
})
export type SubNativeToken = z.infer<typeof SubNativeTokenDef>

export const CustomSubNativeTokenDef = SubNativeTokenDef.extend({
  isCustom: z.literal(true),
})
export type CustomSubNativeToken = z.infer<typeof CustomSubNativeTokenDef>
// import { ChainId } from "../Chain"
// import { NewTokenType } from "./types"

// type ModuleType = "substrate-native"

// export type SubNativeToken = NewTokenType<
//   ModuleType,
//   {
//     existentialDeposit: string
//     chain: { id: ChainId }
//   }
// >
// export type CustomSubNativeToken = SubNativeToken & { isCustom: true }
