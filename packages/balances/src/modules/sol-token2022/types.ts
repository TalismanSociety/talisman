import { SolToken2022TokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

export const SolToken2022TokenConfigSchema = z.strictObject({
  mintAddress: SolToken2022TokenSchema.shape.mintAddress,
  ...TokenConfigBaseSchema.shape,
})

export type SolToken2022TokenConfig = z.infer<typeof SolToken2022TokenConfigSchema>
