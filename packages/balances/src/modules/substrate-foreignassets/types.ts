import { SubForeignAssetsTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const SubForeignAssetsTokenConfigSchema = z.strictObject({
  onChainId: SubForeignAssetsTokenSchema.shape.onChainId,
  ...TokenConfigBaseSchema.shape,
})

export type SubForeignAssetsTokenConfig = z.infer<typeof SubForeignAssetsTokenConfigSchema>
