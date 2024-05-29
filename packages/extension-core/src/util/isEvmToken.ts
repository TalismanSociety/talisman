import { EvmErc20Token, EvmNativeToken, EvmUniswapV2Token } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"

export const isEvmToken = <T extends Token>(
  token?: T | null | EvmNativeToken | EvmErc20Token | EvmUniswapV2Token
): token is EvmNativeToken | EvmErc20Token | EvmUniswapV2Token => {
  return !!token?.evmNetwork
}
