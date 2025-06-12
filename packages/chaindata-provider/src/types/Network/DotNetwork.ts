import z from "zod/v4"

import { NetworkBaseDef } from "./NetworkBase"

export const DotNetworkDef = NetworkBaseDef.extend({
  platform: z.literal("polkadot"),
  isRelay: z.boolean().optional(), // has paras pallet
  specName: z.string(),
  specVersion: z.number(), // UNSAFE: need to query to be sure, it can change anytime
  account: z.enum(["polkadot", "ethereum"]), // some chains support both (ex: hydration)
  chainspecQrUrl: z.string().optional(),
  latestMetadataQrUrl: z.string().optional(),
  overrideNativeTokenId: z.string().optional(), // TODO: explain why we need this
  prefix: z.number(),
  oldPrefix: z.number().optional(),
  rpcs: z.array(z.url({ protocol: /^wss$/ })),
  relayId: z.string().optional(),
  paraId: z.number().optional(), // u32, can use number
  registryTypes: z.any().optional(),
  signedExtensions: z.any().optional(),
  hasCheckMetadataHash: z.boolean().optional(),
  hasExtrinsicSignatureTypePrefix: z.boolean().optional(),
  isUnknownFeeToken: z.boolean().optional(),
})
export type DotNetwork = z.infer<typeof DotNetworkDef>
