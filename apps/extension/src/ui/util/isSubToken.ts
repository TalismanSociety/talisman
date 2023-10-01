import { Token } from "@core/domains/tokens/types"
import {
  SubAssetsToken,
  SubEquilibriumToken,
  SubNativeToken,
  SubOrmlToken,
  SubTokensToken,
} from "@talismn/balances"

export const isSubToken = <T extends Token>(
  token?:
    | T
    | null
    | SubOrmlToken
    | SubNativeToken
    | SubEquilibriumToken
    | SubTokensToken
    | SubAssetsToken
): token is
  | SubOrmlToken
  | SubNativeToken
  | SubEquilibriumToken
  | SubTokensToken
  | SubAssetsToken => {
  return !!token?.chain
}
