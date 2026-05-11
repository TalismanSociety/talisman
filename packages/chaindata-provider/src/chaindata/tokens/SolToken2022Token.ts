import z from "zod/v4"

import type { SolNetworkId } from "../networks"
import { SolanaAddressSchema } from "../shared"
import type { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "sol-token2022"

export const SolToken2022TokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("solana"),
  mintAddress: SolanaAddressSchema,
  isTransferable: z.boolean().optional(),
})
export type SolToken2022Token = z.infer<typeof SolToken2022TokenSchema>

export const SolToken2022BalancesConfigSchema = z.strictObject({})

export type SolToken2022BalancesConfig = z.infer<typeof SolToken2022BalancesConfigSchema>

export type SolToken2022TokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: SolNetworkId
  mintAddress: string
}

export const solToken2022TokenId = (networkId: string, mintAddress: string) =>
  generateTokenId(networkId, TOKEN_TYPE, mintAddress)

export const parseSolToken2022TokenId = (tokenId: TokenId): SolToken2022TokenIdSpecs => {
  const [networkId, type, mintAddress] = tokenId.split(":")
  if (!networkId || !mintAddress) throw new Error(`Invalid SolToken2022Token ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid SolToken2022Token type: ${type}`)

  return {
    type,
    networkId,
    mintAddress: SolanaAddressSchema.parse(mintAddress),
  }
}
