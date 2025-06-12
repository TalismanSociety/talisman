import z from "zod/v4"

import { NetworkBaseDef } from "./NetworkBase"

export const DotNetworkDef = NetworkBaseDef.extend({
  platform: z.literal("polkadot"),
  specName: z.string(),
  specVersion: z.number(),
  account: z.enum(["*25519", "secp256k1"]),
  chainspecQrUrl: z.string().optional(),
  latestMetadataQrUrl: z.string().optional(),
  overrideNativeTokenId: z.string().optional(),
  prefix: z.number(),
  oldPrefix: z.number().optional(),
  rpcs: z.array(z.url({ protocol: /^wss$/ })),
  relayId: z.string().optional(),
  paraId: z.string().optional(),
  registryTypes: z.any().optional(),
  signedExtensions: z.any().optional(),
  hasCheckMetadataHash: z.boolean().optional(),
  hasExtrinsicSignatureTypePrefix: z.boolean().optional(),
  isUnknownFeeToken: z.boolean().optional(),
})
export type DotNetwork = z.infer<typeof DotNetworkDef>
