import LZString from "lz-string"
import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-tokens"

export const SubTokensTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  onChainId: z.union([z.string(), z.number()]),
  existentialDeposit: z.string(),
})
export type SubTokensToken = z.infer<typeof SubTokensTokenSchema>

export const SubTokensBalancesConfigSchema = z.object({
  palletId: z.string().optional(),
})

export type SubTokensBalancesConfig = z.infer<typeof SubTokensBalancesConfigSchema>

export type SubTokensTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  onChainId: string
}

export const subTokensTokenId = (networkId: NetworkId, onChainId: string | number) =>
  generateTokenId(networkId, TOKEN_TYPE, LZString.compressToEncodedURIComponent(String(onChainId)))

export const parseSubTokensTokenId = (tokenId: string): SubTokensTokenIdSpecs => {
  const [networkId, type, onChainId] = tokenId.split(":")
  if (!networkId || !onChainId) throw new Error(`Invalid SubTokensToken ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid SubTokensToken type: ${type}`)

  return {
    type,
    networkId,
    onChainId: LZString.decompressFromEncodedURIComponent(onChainId) || "",
  }
}
