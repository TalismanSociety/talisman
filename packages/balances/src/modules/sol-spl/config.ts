import { SolSplTokenSchema } from "@talismn/chaindata-provider"

export const MODULE_TYPE = SolSplTokenSchema.shape.type.value
export const PLATFORM = SolSplTokenSchema.shape.platform.value

export { type SolSplTokenConfig as TokenConfig } from "./types"
