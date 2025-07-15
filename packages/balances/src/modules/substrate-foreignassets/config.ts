import { SubForeignAssetsTokenSchema } from "@talismn/chaindata-provider"

export { type SubForeignAssetsTokenConfig as TokenConfig } from "./types"

export const MODULE_TYPE = SubForeignAssetsTokenSchema.shape.type.value
export const PLATFORM = SubForeignAssetsTokenSchema.shape.platform.value
