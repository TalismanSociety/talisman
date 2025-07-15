import { SubTokensTokenSchema } from "@talismn/chaindata-provider"

export type { SubTokensTokenConfig as TokenConfig } from "./types"
export type { SubTokensModuleConfig as ModuleConfig } from "./types"
export type { SubTokensMiniMetadataExtra as MiniMetadataExtra } from "./types"

export const MODULE_TYPE = SubTokensTokenSchema.shape.type.value
export const PLATFORM = SubTokensTokenSchema.shape.platform.value
