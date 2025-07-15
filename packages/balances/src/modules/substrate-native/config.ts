import { SubNativeTokenSchema } from "@talismn/chaindata-provider"

export {
  type SubNativeMiniMetadataExtra as MiniMetadataExtra,
  type SubNativeModuleConfig as ModuleConfig,
  type SubNativeTokenConfig as TokenConfig,
} from "./types"

export const MODULE_TYPE = SubNativeTokenSchema.shape.type.value
export const PLATFORM = SubNativeTokenSchema.shape.platform.value
