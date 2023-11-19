import {
  fetchInitChains,
  fetchInitEvmNetworks,
  fetchInitMiniMetadatas,
  fetchInitTokens,
} from "../init"

export const fetchChains = async () => await fetchInitChains()
export const fetchChain = async (chainId: string) =>
  (await fetchChains()).find(({ id }) => id === chainId)

export const fetchEvmNetworks = async () => await fetchInitEvmNetworks()
export const fetchEvmNetwork = async (evmNetworkId: string) =>
  (await fetchEvmNetworks()).find(({ id }) => id === evmNetworkId)

export const fetchTokens = async () => await fetchInitTokens()
export const fetchToken = async (tokenId: string) =>
  (await fetchTokens()).find(({ id }) => id === tokenId)

export const fetchMiniMetadatas = async () => await fetchInitMiniMetadatas()

export const availableTokenLogoFilenames = async (): Promise<string[]> => Promise.resolve([])
