import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenBase } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-psp22"

export const SubPsp22TokenSchema = TokenBase.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  existentialDeposit: z.string(),
  contractAddress: z.string(),
})
export type SubPsp22Token = z.infer<typeof SubPsp22TokenSchema>

export const subPsp22TokenId = (networkId: NetworkId, contractAddress: string) =>
  generateTokenId(networkId, TOKEN_TYPE, contractAddress.toLowerCase())
