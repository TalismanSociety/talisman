import { CustomEvmErc20Token } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"

export const isCustomErc20Token = <T extends Token>(
  token?: T | null | CustomEvmErc20Token
): token is CustomEvmErc20Token => {
  return token?.type === "evm-erc20" && (token as CustomEvmErc20Token).isCustom
}
