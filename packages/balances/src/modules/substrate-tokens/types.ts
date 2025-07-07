import { SubTokensTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

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
export type SubTokensTokenConfig = z.infer<typeof SubTokensTokenConfigSchema>

export const SubTokensModuleConfigSchema = z.strictObject({
  palletId: z.string().optional(),
})

// Do not use this type outside of this module
export type SubTokensModuleConfig = z.infer<typeof SubTokensModuleConfigSchema>

export const SubTokensMiniMetadataExtraSchema = z.strictObject({
  palletId: z.string(),
})

export type SubTokensMiniMetadataExtra = z.infer<typeof SubTokensMiniMetadataExtraSchema>
