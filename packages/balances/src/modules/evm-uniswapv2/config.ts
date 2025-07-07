import { EvmUniswapV2TokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

export const MODULE_TYPE = EvmUniswapV2TokenSchema.shape.type.value
export const PLATFORM = EvmUniswapV2TokenSchema.shape.platform.value

// to be used by chaindata too
export const EvmUniswapV2TokenConfigSchema = z.strictObject({
  contractAddress: EvmUniswapV2TokenSchema.shape.contractAddress,
  ...TokenConfigBaseSchema.shape,
})

export type EvmUniswapV2TokenConfig = z.infer<typeof EvmUniswapV2TokenConfigSchema>
