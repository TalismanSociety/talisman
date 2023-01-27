import { Token } from "@core/domains/tokens/types"
import { SubAssetsToken } from "@talismn/balances-substrate-assets"
import { SubEquilibriumToken } from "@talismn/balances-substrate-equilibrium"
import { SubNativeToken } from "@talismn/balances-substrate-native"
import { SubOrmlToken } from "@talismn/balances-substrate-orml"
import { SubTokensToken } from "@talismn/balances-substrate-tokens"

// export const isSubNativeToken = <T extends Token>(
//   token?: T | null | SubNativeToken
// ): token is SubNativeToken => {
//   return token?.type === "substrate-native"
// }

// export const isSubOrmlToken = <T extends Token>(
//   token?: T | null | SubOrmlToken
// ): token is SubOrmlToken => {
//   return token?.type === "substrate-orml"
// }

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
  return !!token?.type.startsWith("substrate")
}
