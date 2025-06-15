import LZString from "lz-string"
import z from "zod/v4"

import { NetworkId } from "../networks"
import { TokenBase } from "./TokenBase"
import { generateTokenId } from "./utils"

const TOKEN_TYPE = "substrate-tokens"

export const SubTokensTokenSchema = TokenBase.extend({
  type: z.literal(TOKEN_TYPE),
  platform: z.literal("polkadot"),
  onChainId: z.union([z.string(), z.number()]),
  existentialDeposit: z.string(),
})
export type SubTokensToken = z.infer<typeof SubTokensTokenSchema>

export const subTokensTokenId = (networkId: NetworkId, onChainId: string | number) =>
  generateTokenId(networkId, TOKEN_TYPE, LZString.compressToEncodedURIComponent(String(onChainId)))
