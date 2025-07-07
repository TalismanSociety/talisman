import { EvmNativeTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

export const MODULE_TYPE = EvmNativeTokenSchema.shape.type.value
export const PLATFORM = EvmNativeTokenSchema.shape.platform.value

// to be used by chaindata too
export const EvmNativeTokenConfigSchema = z.strictObject({
  ...TokenConfigBaseSchema.shape,
})

export type EvmNativeTokenConfig = z.infer<typeof EvmNativeTokenConfigSchema>
