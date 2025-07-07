import { EvmUniswapV2TokenSchema } from "@talismn/chaindata-provider"

export { type EvmUniswapV2TokenConfig as TokenConfig } from "./types"

export const MODULE_TYPE = EvmUniswapV2TokenSchema.shape.type.value
export const PLATFORM = EvmUniswapV2TokenSchema.shape.platform.value
