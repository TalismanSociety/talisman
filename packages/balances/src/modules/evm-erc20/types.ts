import { TokenConfigBaseSchema } from "@talismn/balances/src/types/tokens"
import { EvmErc20TokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

// to be used by chaindata too
export const EvmErc20TokenConfigSchema = z.strictObject({
  contractAddress: EvmErc20TokenSchema.shape.contractAddress,
  ...TokenConfigBaseSchema.shape,
})

export type EvmErc20TokenConfig = z.infer<typeof EvmErc20TokenConfigSchema>
