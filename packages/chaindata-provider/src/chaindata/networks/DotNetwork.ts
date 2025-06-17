import z from "zod/v4"

import { HexStringSchema } from "../shared"
import { NetworkBaseSchema } from "./NetworkBase"

export const DotNetworkTopologyInfoSchema = z.discriminatedUnion("type", [
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
  isRelay: z.boolean().optional(), // has paras pallet
  chainName: z.string(), // system_chain - used only to lookup typesBundle in p.js, for chains that do not have metadata v14
  specName: z.string(),
  specVersion: z.number(),
  account: z.enum(["secp256k1", "*25519"]),
  chainspecQrUrl: z.string().nonempty().optional(),
  latestMetadataQrUrl: z.string().nonempty().optional(),
  overrideNativeTokenId: z.string().nonempty().optional(), // TODO: explain why we need this
  prefix: z.number(),
  oldPrefix: z.number().optional(),
  rpcs: z.array(z.url({ protocol: /^wss?$/ })),
  relayId: z.string().nonempty().optional(),
  paraId: z.number().optional(), // u32, can use number
  registryTypes: z.any().optional(),
  signedExtensions: z.any().optional(),
  hasCheckMetadataHash: z.boolean().optional(),
  hasExtrinsicSignatureTypePrefix: z.boolean().optional(),
  isUnknownFeeToken: z.boolean().optional(),
  topologyInfo: DotNetworkTopologyInfoSchema,
})

export type DotNetwork = z.infer<typeof DotNetworkSchema>

export type DotNetworkId = DotNetwork["id"]

export type DotNetworkList = Record<DotNetworkId, DotNetwork>
