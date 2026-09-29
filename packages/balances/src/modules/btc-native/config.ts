import { BtcNativeTokenSchema } from "@talismn/chaindata-provider"

export type { BtcNativeTokenConfig as TokenConfig } from "./types"

export const MODULE_TYPE = BtcNativeTokenSchema.shape.type.value
export const PLATFORM = BtcNativeTokenSchema.shape.platform.value
