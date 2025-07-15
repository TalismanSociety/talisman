import { SubAssetsTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { SubAssetsTokenConfigSchema } from "./types"

export const MODULE_TYPE = SubAssetsTokenSchema.shape.type.value
export const PLATFORM = SubAssetsTokenSchema.shape.platform.value

export type TokenConfig = z.infer<typeof SubAssetsTokenConfigSchema>
