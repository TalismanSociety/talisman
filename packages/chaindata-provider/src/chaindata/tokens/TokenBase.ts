import z from "zod/v4"

import { DecimalsSchema } from "../shared"

export const TokenBaseSchema = z.strictObject({
  id: z.string(),
  networkId: z.string(),
  isDefault: z.boolean().optional(),
  decimals: DecimalsSchema,
  symbol: z.string().nonempty(),
  name: z.string().optional(),
  logo: z.string().optional(),
  coingeckoId: z.string().optional(),
  noDiscovery: z.boolean().optional(),
  mirrorOf: z.string().optional(),
})
export type TokenBase = z.infer<typeof TokenBaseSchema>
