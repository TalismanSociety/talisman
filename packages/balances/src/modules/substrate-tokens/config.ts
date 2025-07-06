import { SubTokensTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

export const MODULE_TYPE = SubTokensTokenSchema.shape.type.value
export const PLATFORM = SubTokensTokenSchema.shape.platform.value

// to be used by chaindata too
export const SubTokensTokenConfigSchema = z.strictObject({
  onChainId: SubTokensTokenSchema.shape.onChainId,
  ...TokenConfigBaseSchema.shape,

  // force these 3 fields because in this module we wont pull anything from chain
  symbol: z.string().nonempty(),
  decimals: z.number(),
  existentialDeposit: z.string().nonempty(),
})

// Do not use this type outside of this module
export type TokenConfig = z.infer<typeof SubTokensTokenConfigSchema>

// Do not use this type outside of this module
export type ModuleConfig = {
  palletId?: string
}

export type MiniMetadataExtra = {
  palletId: string
}
