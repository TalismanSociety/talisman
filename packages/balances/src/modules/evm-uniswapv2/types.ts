import { EvmUniswapV2TokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const EvmUniswapV2TokenConfigSchema = z.strictObject({
  contractAddress: EvmUniswapV2TokenSchema.shape.contractAddress,
  ...TokenConfigBaseSchema.shape,
})

export type EvmUniswapV2TokenConfig = z.infer<typeof EvmUniswapV2TokenConfigSchema>
