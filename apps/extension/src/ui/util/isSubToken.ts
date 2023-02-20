import { Token } from "@core/domains/tokens/types"
import { SubAssetsToken } from "@talismn/balances-substrate-assets"
import { SubEquilibriumToken } from "@talismn/balances-substrate-equilibrium"
import { SubNativeToken } from "@talismn/balances-substrate-native"
import { SubOrmlToken } from "@talismn/balances-substrate-orml"
import { SubTokensToken } from "@talismn/balances-substrate-tokens"

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
