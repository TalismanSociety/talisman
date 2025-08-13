import { SolNativeTokenSchema } from "@talismn/chaindata-provider"

export { type SolNativeTokenConfig as TokenConfig } from "./types"

export const MODULE_TYPE = SolNativeTokenSchema.shape.type.value
export const PLATFORM = SolNativeTokenSchema.shape.platform.value
