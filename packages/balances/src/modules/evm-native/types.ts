import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const EvmNativeTokenConfigSchema = z.strictObject({
  ...TokenConfigBaseSchema.shape,
})

export type EvmNativeTokenConfig = z.infer<typeof EvmNativeTokenConfigSchema>
