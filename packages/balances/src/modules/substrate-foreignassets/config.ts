import { SubForeignAssetsTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

export const MODULE_TYPE = SubForeignAssetsTokenSchema.shape.type.value
export const PLATFORM = SubForeignAssetsTokenSchema.shape.platform.value

// to be used by chaindata too
export const SubForeignAssetsTokenConfigSchema = z.strictObject({
  onChainId: SubForeignAssetsTokenSchema.shape.onChainId,
  ...TokenConfigBaseSchema.shape,
})

export type TokenConfig = z.infer<typeof SubForeignAssetsTokenConfigSchema>
