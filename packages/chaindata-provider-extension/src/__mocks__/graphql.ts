import { fetchInitChains, fetchInitEvmNetworks, fetchInitTokens } from "../init"

export const fetchChains = async () => await fetchInitChains()

export const fetchEvmNetworks = async () => await fetchInitEvmNetworks()
export const fetchEvmNetwork = async (evmNetworkId: string) =>
  (await fetchEvmNetworks()).find(({ id }) => id === evmNetworkId)

export const fetchTokens = async () => await fetchInitTokens()
export const fetchToken = async (tokenId: string) =>
  (await fetchTokens()).find(({ id }) => id === tokenId)?.data
