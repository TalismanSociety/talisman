import { EvmErc20Token } from "@talismn/balances-evm-erc20"
import { EvmNativeToken } from "@talismn/balances-evm-native"
import { Token } from "@talismn/chaindata-provider"

export const isEvmToken = <T extends Token>(
  token?: T | null | EvmErc20Token | EvmNativeToken
): token is EvmErc20Token | EvmNativeToken => {
  return !!token?.evmNetwork
}
