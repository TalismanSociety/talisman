import {
  fetchInitChains,
  fetchInitEvmNetworks,
  fetchInitMiniMetadatas,
  fetchInitSubstrateTokens,
} from "../init"

export const fetchChains = async () => await fetchInitChains()
export const fetchChain = async (chainId: string) =>
  (await fetchChains()).find(({ id }) => id === chainId)

export const fetchEvmNetworks = async () => await fetchInitEvmNetworks()
export const fetchEvmNetwork = async (evmNetworkId: string) =>
  (await fetchEvmNetworks()).find(({ id }) => id === evmNetworkId)

export const fetchSubstrateTokens = async () => await fetchInitSubstrateTokens()
export const fetchSubstrateToken = async (tokenId: string) =>
  (await fetchSubstrateTokens()).find(({ id }) => id === tokenId)

export const fetchMiniMetadatas = async () => await fetchInitMiniMetadatas()

export const availableTokenLogoFilenames = async (): Promise<string[]> => Promise.resolve([])
