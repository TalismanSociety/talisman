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

export const NetworkBase = z.object({
  id: z.string(),
  isTestnet: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  forceScan: z.boolean().optional(),
  name: z.string().nonempty(),
  logo: z.string().optional(),
  nativeTokenId: z.string(),
  themeColor: z.string().optional(),
  blockExplorerUrls: z.array(z.url({ protocol: /^https$/ })).optional(),
  balancesConfig: BalanceModuleConfig.optional(),
})
export type NetworkBase = z.infer<typeof NetworkBase>
