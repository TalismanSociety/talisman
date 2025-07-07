import { EvmErc20TokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

export const MODULE_TYPE = EvmErc20TokenSchema.shape.type.value
export const PLATFORM = EvmErc20TokenSchema.shape.platform.value

// to be used by chaindata too
export const EvmErc20TokenConfigSchema = z.strictObject({
  contractAddress: EvmErc20TokenSchema.shape.contractAddress,
  ...TokenConfigBaseSchema.shape,
})

export type EvmErc20TokenConfig = z.infer<typeof EvmErc20TokenConfigSchema>
