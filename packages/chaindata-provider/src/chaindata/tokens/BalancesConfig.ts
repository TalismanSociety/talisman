// import z from "zod/v4"

// export const TokenConfigBaseSchema = TokenBaseSchema.partial().omit({ id: true })

// export const BalancesConfigTokenSchema = z.union([
//   EvmNativeTokenConfigSchema,
//   EvmErc20TokenConfigSchema,
// ])

// export const BalancesConfigSchema = z.object({
//   "evm-native": EvmNativeTokenConfigSchema,
//   "evm-erc20": EvmErc20TokenConfigSchema,
//   "evm-uniswapv2": EvmUniswapV2TokenConfigSchema,
//   "substrate-native": TokenConfigBaseSchema,
//   "substrate-tokens": TokenConfigBaseSchema,
//   "substrate-assets": TokenConfigBaseSchema,
//   "substrate-psp22": TokenConfigBaseSchema,
// }).partial()

/**
 * A selection of fields which can be set as part of the `BalancesConfig` section on chaindata for any module type.
 *
 * Generally speaking, these fields will override any defaults set by the module itself.
 *
 * E.g. if the module determines a native token to have the symbol `IBTC`, but we want to show it
 * as `iBTC`, we can set the `symbol` field in chaindata at: `chains.interlay.balancesConfig.substrate-native.symbol`.
 */
// export type BalancesConfigTokenParams = z.infer<typeof TokenConfigBaseSchema>
