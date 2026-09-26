import z from "zod/v4"

import { BtcNativeBalancesConfigSchema } from "../tokens/BtcNativeToken"
import { NetworkBaseSchema } from "./NetworkBase"

export const BtcNetworkBalancesConfigSchema = z.strictObject({
  "btc-native": BtcNativeBalancesConfigSchema.optional(),
})

export type BtcNetworkBalancesConfig = z.infer<typeof BtcNetworkBalancesConfigSchema>

export const BtcNetworkSchema = NetworkBaseSchema.extend({
  platform: z.literal("bitcoin"),
  /** esplora REST API bases, including the /api segment (e.g. https://mempool.space/api) */
  rpcs: z.array(z.url({ protocol: /^https?$/ })),
  /** bech32 human-readable prefix: bc = mainnet, tb = signet/testnet */
  addressPrefix: z.enum(["bc", "tb"]),
  balancesConfig: BtcNetworkBalancesConfigSchema.optional(),
})

export type BtcNetwork = z.infer<typeof BtcNetworkSchema>

export type BtcNetworkId = BtcNetwork["id"]

export type BtcNetworkList = Record<BtcNetworkId, BtcNetwork>
