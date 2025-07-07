import { EvmNativeTokenSchema } from "@talismn/chaindata-provider"

export { type EvmNativeTokenConfig as TokenConfig } from "./types"

export const MODULE_TYPE = EvmNativeTokenSchema.shape.type.value
export const PLATFORM = EvmNativeTokenSchema.shape.platform.value
