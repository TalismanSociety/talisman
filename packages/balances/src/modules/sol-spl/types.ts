import { SolSplTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const SolSplTokenConfigSchema = z.strictObject({
  mintAddress: SolSplTokenSchema.shape.mintAddress,
  ...TokenConfigBaseSchema.shape,
})

export type SolSplTokenConfig = z.infer<typeof SolSplTokenConfigSchema>
