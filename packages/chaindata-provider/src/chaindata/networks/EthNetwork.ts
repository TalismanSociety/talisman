import z from "zod/v4"

import { EthereumAddressSchema } from "../shared"
import {
  EvmErc20BalancesConfigSchema,
  EvmNativeBalancesConfigSchema,
  EvmUniswapV2BalancesConfigSchema,
} from "../tokens"
import { NetworkBaseSchema } from "./NetworkBase"

export const EthNetworkBalancesConfigSchema = z.strictObject({
  "evm-native": EvmNativeBalancesConfigSchema.optional(),
  "evm-erc20": EvmErc20BalancesConfigSchema.optional(),
  "evm-uniswapv2": EvmUniswapV2BalancesConfigSchema.optional(),
})

export type EthNetworkBalancesConfig = z.infer<typeof EthNetworkBalancesConfigSchema>

const ContractsSchema = z.strictObject({
  Erc20Aggregator: EthereumAddressSchema.optional(),
  Multicall3: EthereumAddressSchema.optional(),
})

const L2FeeSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("op-stack"),
  }),
  z.strictObject({
    type: z.literal("scroll"),
    l1GasPriceOracle: EthereumAddressSchema,
  }),
])

export const EthNetworkSchema = NetworkBaseSchema.extend({
  platform: z.literal("ethereum"),
  substrateChainId: z.string().optional(),
  preserveGasEstimate: z.boolean().optional(),
  rpcs: z.array(z.url({ protocol: /^https?$/ })),
  feeType: z.enum(["legacy", "eip-1559"]).optional(),
  l2FeeType: L2FeeSchema.optional(),
  contracts: ContractsSchema.optional(),
  balancesConfig: EthNetworkBalancesConfigSchema.optional(),
})

export type EthNetwork = z.infer<typeof EthNetworkSchema>

export type EthNetworkId = EthNetwork["id"]

export type EthNetworkList = Record<EthNetworkId, EthNetwork>
