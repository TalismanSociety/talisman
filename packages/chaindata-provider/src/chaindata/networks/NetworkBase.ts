import { z } from "zod/v4"

export const NetworkBaseSchema = z.strictObject({
  id: z.string().nonempty(),
  isTestnet: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  forceScan: z.boolean().optional(),
  name: z.string().nonempty(),
  logo: z.string().nonempty().optional(),
  nativeTokenId: z.string().nonempty(),
  nativeCurrency: z.strictObject({
    decimals: z.uint32(),
    symbol: z.string().nonempty(),
    name: z.string().nonempty(),
    coingeckoId: z.string().optional(),
    mirrorOf: z.string().optional(),
    logo: z.string().optional(),
  }),
  themeColor: z.string().nonempty().optional(),
  blockExplorerUrls: z.array(z.url({ protocol: /^https?$/ })).default([]),
})
export type NetworkBase = z.infer<typeof NetworkBaseSchema>
