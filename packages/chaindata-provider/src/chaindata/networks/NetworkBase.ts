import { z } from "zod/v4"

const BalanceModuleType = z.enum([
  "evm-native",
  "evm-erc20",
  "evm-uniswapv2",
  "substrate-native",
  "substrate-assets",
  "substrate-psp22",
  "substrate-tokens",
])

export type BalanceModuleType = z.infer<typeof BalanceModuleType>
export const BalanceModuleConfig = z.partialRecord(BalanceModuleType, z.any())

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
  blockExplorerUrls: z.array(z.url({ protocol: /^https?$/ })).optional(),
})
export type NetworkBase = z.infer<typeof NetworkBaseSchema>
