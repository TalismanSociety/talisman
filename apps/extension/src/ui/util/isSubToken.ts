import { Token } from "@core/domains/tokens/types"
import {
  SubAssetsToken,
  SubEquilibriumToken,
  SubNativeToken,
  SubPsp22Token,
  SubTokensToken,
} from "@talismn/balances"

export const isSubToken = <T extends Token>(
  token?:
    | T
    | null
    | SubAssetsToken
    | SubEquilibriumToken
    | SubNativeToken
    | SubPsp22Token
    | SubTokensToken
): token is
  | SubAssetsToken
  | SubEquilibriumToken
  | SubNativeToken
  | SubPsp22Token
  | SubTokensToken => {
  return !!token?.chain
}
