import { Token } from "@core/domains/tokens/types"
import { SubNativeToken } from "@talismn/balances-substrate-native"
import { SubOrmlToken } from "@talismn/balances-substrate-orml"

export const isSubNativeToken = <T extends Token>(
  token?: T | null | SubNativeToken
): token is SubNativeToken => {
  return token?.type === "substrate-native"
}

export const isSubOrmlToken = <T extends Token>(
  token?: T | null | SubOrmlToken
): token is SubOrmlToken => {
  return token?.type === "substrate-orml"
}

export const isSubToken = <T extends Token>(
  token?: T | null | SubOrmlToken | SubNativeToken
): token is SubOrmlToken | SubNativeToken => {
  return isSubNativeToken(token) || isSubOrmlToken(token)
}
