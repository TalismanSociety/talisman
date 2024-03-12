import { EvmErc20Token } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"

export const isErc20Token = <T extends Token>(
  token?: T | null | EvmErc20Token
): token is EvmErc20Token => {
  return token?.type === "evm-erc20"
}
