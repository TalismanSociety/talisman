import { SubGammaTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

export const MODULE_TYPE = SubGammaTokenSchema.shape.type.value
export const PLATFORM = SubGammaTokenSchema.shape.platform.value

export const SubGammaTokenConfigSchema = z.strictObject({
  netuid: SubGammaTokenSchema.shape.netuid,
  ...TokenConfigBaseSchema.shape,
})

export type SubGammaTokenConfig = z.infer<typeof SubGammaTokenConfigSchema>
