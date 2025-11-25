import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-hydration"

export const SubHydrationTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  onChainId: z.uint32(),
  assetType: z.enum(["Token", "Erc20", "External"]),
  isSufficient: z.boolean(),
  existentialDeposit: z.string(),
})
export type SubHydrationToken = z.infer<typeof SubHydrationTokenSchema>

export const SubHydrationBalancesConfigSchema = z.strictObject({})

export type SubHydrationBalancesConfig = z.infer<typeof SubHydrationBalancesConfigSchema>

export type SubHydrationTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  onChainId: number
}

export const subHydrationTokenId = (networkId: NetworkId, onChainId: number) =>
  generateTokenId(networkId, TOKEN_TYPE, String(onChainId))

export const parseSubHydrationTokenId = (tokenId: string): SubHydrationTokenIdSpecs => {
  const [networkId, type, onChainId] = tokenId.split(":")
  if (!networkId || !onChainId) throw new Error(`Invalid ${TOKEN_TYPE} ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid ${TOKEN_TYPE} type: ${type}`)

  return {
    type,
    networkId,
    onChainId: Number(onChainId),
  }
}
