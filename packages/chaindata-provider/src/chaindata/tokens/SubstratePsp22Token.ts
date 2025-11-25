import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenId } from "./Token"
import { TokenBaseSchema } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-psp22"

export const SubPsp22TokenSchema = TokenBaseSchema.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  contractAddress: z.string().nonempty(),
})
export type SubPsp22Token = z.infer<typeof SubPsp22TokenSchema>

export const SubPsp22BalancesConfigSchema = z.strictObject({})

export type SubPsp22BalancesConfig = z.infer<typeof SubPsp22BalancesConfigSchema>

export type SubPsp22TokenIdSpecs = {
  type: typeof TOKEN_TYPE
  networkId: NetworkId
  contractAddress: string
}

export const subPsp22TokenId = (networkId: NetworkId, contractAddress: string) =>
  generateTokenId(networkId, TOKEN_TYPE, contractAddress.toLowerCase())

export const parseSubPsp22TokenId = (tokenId: TokenId): SubPsp22TokenIdSpecs => {
  const [networkId, type, contractAddress] = tokenId.split(":")
  if (!networkId || !contractAddress) throw new Error(`Invalid SubPsp22Token ID: ${tokenId}`)
  if (type !== TOKEN_TYPE) throw new Error(`Invalid SubPsp22Token type: ${type}`)

  return {
    type,
    networkId,
    contractAddress,
  }
}
