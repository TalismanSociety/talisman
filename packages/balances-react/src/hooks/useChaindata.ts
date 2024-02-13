import { ChainId, EvmNetworkId, TokenId } from "@talismn/chaindata-provider"
import { useAtomValue } from "jotai"

import { chaindataAtom, chaindataProviderAtom } from "../atoms/chaindata"

export const useChaindataProvider = () => {
  return useAtomValue(chaindataProviderAtom)
}

export const useChaindata = () => {
  return useAtomValue(chaindataAtom)
}

export const useChains = () => useChaindata().chainsById
export const useChain = (chainId?: ChainId) => {
  const chainsById = useChains()
  return chainId ? chainsById[chainId] : undefined
}

export const useEvmNetworks = () => useChaindata().evmNetworksById
export const useEvmNetwork = (evmNetworkId?: EvmNetworkId) => {
  const evmNetworksById = useEvmNetworks()
  return evmNetworkId ? evmNetworksById[evmNetworkId] : undefined
}

export const useTokens = () => useChaindata().tokensById
export const useToken = (tokenId?: TokenId) => {
  const tokensById = useTokens()
  return tokenId ? tokensById[tokenId] : undefined
}
