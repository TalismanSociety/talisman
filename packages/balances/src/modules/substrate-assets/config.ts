import { SubAssetsTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

export const MODULE_TYPE = SubAssetsTokenSchema.shape.type.value
export const PLATFORM = SubAssetsTokenSchema.shape.platform.value

// to be used by chaindata too
export const SubAssetsTokenConfigSchema = z.strictObject({
  assetId: SubAssetsTokenSchema.shape.assetId,
  ...TokenConfigBaseSchema.shape,
})

export type TokenConfig = z.infer<typeof SubAssetsTokenConfigSchema>
