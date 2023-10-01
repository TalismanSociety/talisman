import { EvmErc20Token, EvmNativeToken } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"

export const isEvmToken = <T extends Token>(
  token?: T | null | EvmErc20Token | EvmNativeToken
): token is EvmErc20Token | EvmNativeToken => {
  return !!token?.evmNetwork
}
