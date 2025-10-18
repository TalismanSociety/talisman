import z from "zod/v4"

import { HexStringSchema } from "../shared"
import {
  SubAssetsBalancesConfigSchema,
  SubDTaoBalancesConfigSchema,
  SubForeignAssetsBalancesConfigSchema,
  SubHydrationBalancesConfigSchema,
  SubNativeBalancesConfigSchema,
  SubPsp22BalancesConfigSchema,
  SubTokensBalancesConfigSchema,
} from "../tokens"
import { NetworkBaseSchema } from "./NetworkBase"

export const DotNetworkBalancesConfigSchema = z.strictObject({
  "substrate-native": SubNativeBalancesConfigSchema.optional(),
  "substrate-assets": SubAssetsBalancesConfigSchema.optional(),
  "substrate-psp22": SubPsp22BalancesConfigSchema.optional(),
  "substrate-tokens": SubTokensBalancesConfigSchema.optional(),
  "substrate-foreignassets": SubForeignAssetsBalancesConfigSchema.optional(),
  "substrate-hydration": SubHydrationBalancesConfigSchema.optional(),
  "substrate-dtao": SubDTaoBalancesConfigSchema.optional(),
})

export type DotNetworkBalancesConfig = z.infer<typeof DotNetworkBalancesConfigSchema>

export const DotNetworkTopologySchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("standalone") }),
  z.strictObject({ type: z.literal("relay") }),
  z.strictObject({
    type: z.literal("parachain"),
    relayId: z.string().nonempty(),
    paraId: z.number().int(),
  }),
])

export const DotNetworkSchema = NetworkBaseSchema.extend({
  genesisHash: HexStringSchema,
  platform: z.literal("polkadot"),
  chainName: z.string(), // system_chain - used only to lookup typesBundle in p.js, for chains that do not have metadata v14
  specName: z.string(),
  specVersion: z.uint32().describe("Don't trust it, it might not be up to date"),
  account: z.enum(["secp256k1", "*25519"]),
  chainspecQrUrl: z.string().nonempty().optional(),
  latestMetadataQrUrl: z.string().nonempty().optional(),
  prefix: z.number(),
  oldPrefix: z.number().optional(),
  rpcs: z.array(z.url({ protocol: /^wss?$/ })),
  registryTypes: z.any().optional(),
  signedExtensions: z.any().optional(),
  hasCheckMetadataHash: z.boolean().optional(),
  hasExtrinsicSignatureTypePrefix: z.boolean().optional(),
  isUnknownFeeToken: z.boolean().optional(),
  topology: DotNetworkTopologySchema,
  balancesConfig: DotNetworkBalancesConfigSchema.optional(),
})

export type DotNetwork = z.infer<typeof DotNetworkSchema>

export type DotNetworkId = DotNetwork["id"]

export type DotNetworkList = Record<DotNetworkId, DotNetwork>
