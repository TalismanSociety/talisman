import { EvmUniswapV2Token, Token } from "@talismn/chaindata-provider"

export const isUniswapV2Token = <T extends Token>(
  token?: T | null | EvmUniswapV2Token,
): token is EvmUniswapV2Token => {
  return token?.type === "evm-uniswapv2"
}
