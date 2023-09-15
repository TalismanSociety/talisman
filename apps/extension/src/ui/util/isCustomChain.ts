import { Chain, CustomChain } from "@talismn/chaindata-provider"

export const isCustomChain = <T extends Chain>(
  chain?: T | null | CustomChain
): chain is CustomChain => {
  return !!chain && "isCustom" in chain && chain.isCustom
}
