import { SubHydrationTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const SubHydrationTokenConfigSchema = z.strictObject({
  onChainId: SubHydrationTokenSchema.shape.onChainId,
  ...TokenConfigBaseSchema.shape,
})

export type SubHydrationTokenConfig = z.infer<typeof SubHydrationTokenConfigSchema>
