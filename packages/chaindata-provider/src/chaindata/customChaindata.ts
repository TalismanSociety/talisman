import { keyBy } from "lodash"
import z from "zod/v4"

import { NetworkSchema } from "./networks"
import { TokenSchema } from "./tokens"

export const CustomChaindataSchema = z
  .strictObject({
    networks: z.array(NetworkSchema).optional(),
    tokens: z.array(TokenSchema),
  })
  .check((ctx) => {
    const tokensById = keyBy(ctx.value.tokens, "id")
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
