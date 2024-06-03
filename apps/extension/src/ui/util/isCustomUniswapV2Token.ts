import { CustomEvmUniswapV2Token } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"

import { isUniswapV2Token } from "./isUniswapV2Token"

export const isCustomUniswapV2Token = <T extends Token>(
  token?: T | null | CustomEvmUniswapV2Token
): token is CustomEvmUniswapV2Token => {
  return isUniswapV2Token(token) && (token as CustomEvmUniswapV2Token).isCustom
}
