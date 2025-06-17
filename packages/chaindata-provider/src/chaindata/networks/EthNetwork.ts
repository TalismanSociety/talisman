import z from "zod/v4"

import { EthereumAddressSchema } from "../shared"
import { NetworkBaseSchema } from "./NetworkBase"

const ContractName = z.enum(["Erc20Aggregator", "Multicall3"])

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
  contracts: z.partialRecord(ContractName, EthereumAddressSchema).optional(),
})

export type EthNetwork = z.infer<typeof EthNetworkSchema>

export type EthNetworkId = EthNetwork["id"]

export type EthNetworkList = Record<EthNetworkId, EthNetwork>
