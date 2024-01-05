import { Chain, CustomChain, CustomEvmNetwork, EvmNetwork } from "@talismn/chaindata-provider"

export const isCustomChain = (chain: Chain | CustomChain): chain is CustomChain => {
  return "isCustom" in chain && chain.isCustom === true
}

export const isCustomEvmNetwork = (
  evmNetwork: EvmNetwork | CustomEvmNetwork
): evmNetwork is CustomEvmNetwork => {
  return "isCustom" in evmNetwork && evmNetwork.isCustom === true
}
