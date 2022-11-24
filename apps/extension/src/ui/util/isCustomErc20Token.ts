import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { CustomErc20Token, Erc20Token, Token } from "@core/domains/tokens/types"

export const isCustomErc20Token = <T extends Token>(
  token?: T | null | CustomErc20Token
): token is CustomErc20Token => {
  return token?.type === "erc20" && (token as CustomErc20Token).isCustom
}
