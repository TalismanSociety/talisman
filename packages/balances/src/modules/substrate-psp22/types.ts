import { SubPsp22TokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const SubPsp22TokenConfigSchema = z.strictObject({
  contractAddress: SubPsp22TokenSchema.shape.contractAddress,
  ...TokenConfigBaseSchema.shape,
})

export type SubPsp22TokenConfig = z.infer<typeof SubPsp22TokenConfigSchema>
