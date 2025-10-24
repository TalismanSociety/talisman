import { SubDTaoTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const SubDTaoTokenConfigSchema = z.strictObject({
  netuid: SubDTaoTokenSchema.shape.netuid,
  ...TokenConfigBaseSchema.shape,
})

export type SubDTaoTokenConfig = z.infer<typeof SubDTaoTokenConfigSchema>

export type SubDTaoBalanceMeta = {
  scaledAlphaPrice: string
  refTokenId: string
  refTokenValue: string
}
