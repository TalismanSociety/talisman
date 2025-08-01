import z from "zod/v4"

import { SolNativeBalancesConfigSchema, SolSplBalancesConfigSchema } from "../tokens"
import { NetworkBaseSchema } from "./NetworkBase"

export const SolNetworkBalancesConfigSchema = z.strictObject({
  "sol-native": SolNativeBalancesConfigSchema.optional(),
  "sol-spl": SolSplBalancesConfigSchema.optional(),
})

export type SolNetworkBalancesConfig = z.infer<typeof SolNetworkBalancesConfigSchema>

export const SolNetworkSchema = NetworkBaseSchema.extend({
  platform: z.literal("solana"),
  genesisHash: z.string(),
  rpcs: z.array(z.url({ protocol: /^https?$/ })),
  balancesConfig: SolNetworkBalancesConfigSchema.optional(),
})

export type SolNetwork = z.infer<typeof SolNetworkSchema>

export type SolNetworkId = SolNetwork["id"]

export type SolNetworkList = Record<SolNetworkId, SolNetwork>
