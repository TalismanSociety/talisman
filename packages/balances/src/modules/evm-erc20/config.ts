import { EvmErc20TokenSchema } from "@talismn/chaindata-provider"

export const MODULE_TYPE = EvmErc20TokenSchema.shape.type.value
export const PLATFORM = EvmErc20TokenSchema.shape.platform.value

export { type EvmErc20TokenConfig as TokenConfig } from "./types"
