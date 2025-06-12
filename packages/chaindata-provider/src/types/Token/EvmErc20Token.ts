import z from "zod/v4"

import { EthereumAddress } from "../common"
import { TokenBase } from "./TokenBase"

export const EvmErc20TokenDef = TokenBase.extend({
  type: z.literal("evm-erc20"),
  platform: z.literal("ethereum"),
  contractAddress: EthereumAddress,
  isCustom: z.boolean().optional(),
})
export type EvmErc20Token = z.infer<typeof EvmErc20TokenDef>

export const CustomErc20TokenDef = EvmErc20TokenDef.extend({
  isCustom: z.literal(true),
})
// TODO: do we really need this type in chaindata provider ? feels like a wallet only information
export type CustomEvmErc20Token = z.infer<typeof CustomErc20TokenDef>
