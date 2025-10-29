import { SubDTaoTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { SubDTaoTokenConfigSchema } from "./types"

export const MODULE_TYPE = SubDTaoTokenSchema.shape.type.value
export const PLATFORM = SubDTaoTokenSchema.shape.platform.value

export type TokenConfig = z.infer<typeof SubDTaoTokenConfigSchema>
