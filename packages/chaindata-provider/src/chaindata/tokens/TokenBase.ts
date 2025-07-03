import z from "zod/v4"

export const TokenBaseSchema = z.strictObject({
  id: z.string(),
  networkId: z.string(),
  isDefault: z.boolean().optional(),
  decimals: z.int().min(0),
  symbol: z.string().nonempty(),
  name: z.string().optional(),
  logo: z.string().optional(),
  coingeckoId: z.string().optional(),
  noDiscovery: z.boolean().optional(),
  mirrorOf: z.string().optional(),
})
export type TokenBase = z.infer<typeof TokenBaseSchema>
