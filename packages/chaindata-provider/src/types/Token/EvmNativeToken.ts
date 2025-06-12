import z from "zod/v4"

import { TokenBase } from "./TokenBase"

// import { NewTokenType } from "./types"

// type ModuleType = "evm-native"

export const EvmNativeTokenDef = TokenBase.extend({
  type: z.literal("evm-native"),
  platform: z.literal("ethereum"),
})
export type EvmNativeToken = z.infer<typeof EvmNativeTokenDef>

export const CustomEvmNativeTokenDef = EvmNativeTokenDef.extend({
  isCustom: z.literal(true),
})
export type CustomEvmNativeToken = z.infer<typeof CustomEvmNativeTokenDef>
