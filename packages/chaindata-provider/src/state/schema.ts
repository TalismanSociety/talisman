import { keyBy } from "lodash-es"
import z from "zod/v4"

import { AnyMiniMetadataSchema, NetworkSchema, TokenSchema } from "../chaindata"

export const ChaindataFileSchema = z
  .object({
    networks: z.array(NetworkSchema),
    tokens: z.array(TokenSchema),
    miniMetadatas: z.array(AnyMiniMetadataSchema),
  })
  .check((ctx) => {
    //ensure each network has a native token
    const tokensById = keyBy(ctx.value.tokens, (t) => t.id)
    for (const network of ctx.value.networks ?? []) {
      const nativeToken = tokensById[network.nativeTokenId]
      if (!nativeToken)
        ctx.issues.push({
          code: "custom",
          message: `Network ${network.id} has no native token`,
          input: ctx.value,
          path: ["networks", ctx.value.networks!.indexOf(network), "nativeTokenId"],
        })
    }
  })

export type Chaindata = z.infer<typeof ChaindataFileSchema>

export const CustomChaindataSchema = z
  .strictObject({
    networks: z.array(NetworkSchema).optional(),
    tokens: z.array(TokenSchema),
  })
  .check((ctx) => {
    //ensure each network has a native token
    const tokensById = keyBy(ctx.value.tokens, (t) => t.id)
    for (const network of ctx.value.networks ?? []) {
      const nativeToken = tokensById[network.nativeTokenId]
      if (!nativeToken)
        ctx.issues.push({
          code: "custom",
          message: `Network ${network.id} has no native token`,
          input: ctx.value,
          path: ["networks", ctx.value.networks!.indexOf(network), "nativeTokenId"],
        })
    }
  })

export type CustomChaindata = z.infer<typeof CustomChaindataSchema>
