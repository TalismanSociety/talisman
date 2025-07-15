import { SubHydrationTokenSchema } from "@talismn/chaindata-provider"

export { type SubHydrationTokenConfig as TokenConfig } from "./types"

export const MODULE_TYPE = SubHydrationTokenSchema.shape.type.value
export const PLATFORM = SubHydrationTokenSchema.shape.platform.value
