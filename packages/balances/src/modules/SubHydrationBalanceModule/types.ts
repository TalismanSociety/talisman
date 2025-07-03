import { TokenConfigBaseSchema } from "@talismn/balances/src/types/tokens"
import { SubHydrationTokenSchema } from "@talismn/chaindata-provider/src/chaindata/tokens/SubstrateHydrationToken"
import z from "zod/v4"

// to be used by chaindata too
export const SubHydrationTokenConfigSchema = z.strictObject({
  onChainId: SubHydrationTokenSchema.shape.onChainId,
  ...TokenConfigBaseSchema.shape,
})

export type SubHydrationTokenConfig = z.infer<typeof SubHydrationTokenConfigSchema>
