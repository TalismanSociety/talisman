import { keyBy } from "lodash-es"
import z from "zod/v4"

import { AnyMiniMetadataSchema, NetworkSchema, TokenSchema } from "../chaindata"

const isSecureRpcUrl = (url: string) => {
  try {
    const { protocol } = new URL(url)
    return protocol === "https:" || protocol === "wss:"
  } catch {
    return false
  }
}

/**
 * A network as it appears in a chaindata file: the feed, the persisted copy of it, the bundled
 * init data and a file passed as `chaindata$`. Cleartext (`http://`, `ws://`) RPCs are removed,
 * because anyone on the path to such an endpoint can rewrite balances, fees and the metadata
 * that encodes what the user signs.
 *
 * The URLs are removed rather than failing the record: a chaindata file that fails validation
 * is rejected as a whole, so one cleartext entry would otherwise stop every wallet updating.
 *
 * `NetworkSchema` itself still accepts cleartext RPCs. Networks and RPCs added by the user
 * (custom chaindata) go through it, and those include local nodes such as Anvil at
 * `http://localhost:8545` and a subtensor devnet on `ws://`.
 */
export const ChaindataFileNetworkSchema = NetworkSchema.overwrite((network) =>
  // zod runs this on a record that already has issues too, so `rpcs` may be anything
  !Array.isArray(network.rpcs) || network.rpcs.every(isSecureRpcUrl)
    ? network
    : { ...network, rpcs: network.rpcs.filter(isSecureRpcUrl) }
)

export const ChaindataFileSchema = z
  .object({
    networks: z.array(ChaindataFileNetworkSchema),
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
export type ChaindataFile = z.input<typeof ChaindataFileSchema>

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
