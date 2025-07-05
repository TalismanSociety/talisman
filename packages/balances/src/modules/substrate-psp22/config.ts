import { SubPsp22TokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

export const MODULE_TYPE = SubPsp22TokenSchema.shape.type.value
export const PLATFORM = SubPsp22TokenSchema.shape.platform.value

// to be used by chaindata too
export const SubPsp22TokenConfigSchema = z.strictObject({
  contractAddress: SubPsp22TokenSchema.shape.contractAddress,
  ...TokenConfigBaseSchema.shape,
})

export type TokenConfig = z.infer<typeof SubPsp22TokenConfigSchema>
