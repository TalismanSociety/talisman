import { CustomEvmErc20Token } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"

import { isErc20Token } from "./isErc20Token"

export const isCustomErc20Token = <T extends Token>(
  token?: T | null | CustomEvmErc20Token
): token is CustomEvmErc20Token => {
  return isErc20Token(token) && (token as CustomEvmErc20Token).isCustom
}
