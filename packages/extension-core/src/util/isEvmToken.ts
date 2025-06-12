import {
  EvmErc20Token,
  EvmNativeToken,
  EvmUniswapV2Token,
  Token,
} from "@talismn/chaindata-provider"

export const isEvmToken = <T extends Token>(
  token?: T | null | EvmNativeToken | EvmErc20Token | EvmUniswapV2Token,
): token is Extract<Token, { platform: "ethereum" }> => {
  return token?.platform === "ethereum"
}
