import { SubAssetsTokenSchema } from "@talismn/chaindata-provider"
import type z from "zod/v4"

import type { SubAssetsTokenConfigSchema } from "./types"

export const MODULE_TYPE = SubAssetsTokenSchema.shape.type.value
export const PLATFORM = SubAssetsTokenSchema.shape.platform.value

export type TokenConfig = z.infer<typeof SubAssetsTokenConfigSchema>
