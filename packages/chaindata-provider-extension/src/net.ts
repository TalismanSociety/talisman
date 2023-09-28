import {
  chaindataChainByIdUrl,
  chaindataChainsAllUrl,
  chaindataEvmNetworkByIdUrl,
  chaindataEvmNetworksAllUrl,
} from "@talismn/chaindata-provider"

export const fetchChains = async () => await (await fetch(chaindataChainsAllUrl)).json()
export const fetchChain = async (chainId: string) =>
  await (await fetch(chaindataChainByIdUrl(chainId))).json()

export const fetchEvmNetworks = async () => await (await fetch(chaindataEvmNetworksAllUrl)).json()
export const fetchEvmNetwork = async (evmNetworkId: string) =>
  await (await fetch(chaindataEvmNetworkByIdUrl(evmNetworkId))).json()
