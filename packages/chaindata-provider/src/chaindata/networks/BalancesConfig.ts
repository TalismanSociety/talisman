// import { z } from "zod/v4"

// import {
//   EvmErc20BalancesConfigSchema,
//   EvmNativeBalancesConfigSchema,
//   EvmUniswapV2BalancesConfigSchema,
//   SubAssetsBalancesConfigSchema,
//   SubNativeBalancesConfigSchema,
//   SubPsp22BalancesConfigSchema,
//   SubTokensBalancesConfigSchema,
// } from "../tokens"

// export const EthNetworkBalancesConfigSchema = z.strictObject({
//   "evm-native": EvmNativeBalancesConfigSchema.optional(),
//   "evm-erc20": EvmErc20BalancesConfigSchema.optional(),
//   "evm-uniswapv2": EvmUniswapV2BalancesConfigSchema.optional(),
// })

// export type EthNetworkBalancesConfig = z.infer<typeof EthNetworkBalancesConfigSchema>

// export const DotNetworkBalancesConfigSchema = z.strictObject({
//   "substrate-native": SubNativeBalancesConfigSchema.optional(),
//   "substrate-assets": SubAssetsBalancesConfigSchema.optional(),
//   "substrate-psp22": SubPsp22BalancesConfigSchema.optional(),
//   "substrate-tokens": SubTokensBalancesConfigSchema.optional(),
// })

// export type DotNetworkBalancesConfig = z.infer<typeof DotNetworkBalancesConfigSchema>

// // export const NetworkBalancesConfigSchema = z.strictObject({
// //   "evm-native": EvmNativeBalancesConfigSchema.optional(),
// //   "evm-erc20": EvmErc20BalancesConfigSchema.optional(),
// //   "evm-uniswapv2": EvmUniswapV2BalancesConfigSchema.optional(),
// //   "substrate-native": SubNativeBalancesConfigSchema.optional(),
// //   "substrate-assets": SubAssetsBalancesConfigSchema.optional(),
// //   "substrate-psp22": SubPsp22BalancesConfigSchema.optional(),
// //   "substrate-tokens": SubTokensBalancesConfigSchema.optional(),
// // })

// // export type NetworkBalancesConfig = z.infer<typeof NetworkBalancesConfigSchema>
