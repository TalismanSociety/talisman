import { SubPsp22TokenSchema } from "@talismn/chaindata-provider"

export type { SubPsp22TokenConfig as TokenConfig } from "./types"

export const MODULE_TYPE = SubPsp22TokenSchema.shape.type.value
export const PLATFORM = SubPsp22TokenSchema.shape.platform.value
