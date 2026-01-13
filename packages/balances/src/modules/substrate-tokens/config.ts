import { SubTokensTokenSchema } from "@talismn/chaindata-provider"

export type {
  SubTokensMiniMetadataExtra as MiniMetadataExtra,
  SubTokensModuleConfig as ModuleConfig,
  SubTokensTokenConfig as TokenConfig,
} from "./types"

export const MODULE_TYPE = SubTokensTokenSchema.shape.type.value
export const PLATFORM = SubTokensTokenSchema.shape.platform.value
