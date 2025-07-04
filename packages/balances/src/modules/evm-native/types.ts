import { TokenConfigBaseSchema } from "@talismn/balances/src/types/tokens"
import z from "zod/v4"

// to be used by chaindata too
export const EvmNativeTokenConfigSchema = z.strictObject({
  ...TokenConfigBaseSchema.shape,
})

export type EvmNativeTokenConfig = z.infer<typeof EvmNativeTokenConfigSchema>
