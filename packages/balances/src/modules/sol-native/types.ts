import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const SolNativeTokenConfigSchema = z.strictObject({
  ...TokenConfigBaseSchema.shape,
})

export type SolNativeTokenConfig = z.infer<typeof SolNativeTokenConfigSchema>
