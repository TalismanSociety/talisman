import z from "zod/v4"

import { SolNetworkId } from "../networks"
import { SolanaAddressSchema } from "../shared"
import { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "sol-spl"

export const SolSplTokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("solana"),
  mintAddress: SolanaAddressSchema,
})
export type SolSplToken = z.infer<typeof SolSplTokenSchema>

export const SolSplBalancesConfigSchema = z.strictObject({})

export type SolSplBalancesConfig = z.infer<typeof SolSplBalancesConfigSchema>

export type SolSplTokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: SolNetworkId
  mintAddress: string
}

export const solSplTokenId = (networkId: string, mintAddress: string) =>
  generateTokenId(networkId, TOKEN_TYPE, mintAddress)

export const parseSolSplTokenId = (tokenId: TokenId): SolSplTokenIdSpecs => {
  const [networkId, type, mintAddress] = tokenId.split(":")
  if (!networkId || !mintAddress) throw new Error(`Invalid SolSplToken ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid SolSplToken type: ${type}`)

  return {
    type,
    networkId,
    mintAddress: SolanaAddressSchema.parse(mintAddress),
  }
}
