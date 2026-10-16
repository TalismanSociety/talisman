import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const BtcNativeTokenConfigSchema = z.strictObject({
  ...TokenConfigBaseSchema.shape,
})

export type BtcNativeTokenConfig = z.infer<typeof BtcNativeTokenConfigSchema>
