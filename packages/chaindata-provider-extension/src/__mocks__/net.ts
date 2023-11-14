import {
  fetchInitChains,
  fetchInitEvmNetworks,
  fetchInitMiniMetadatas,
  fetchInitTokens,
} from "../init"

export const fetchChains = async () => await fetchInitChains()

export const fetchEvmNetworks = async () => await fetchInitEvmNetworks()
export const fetchEvmNetwork = async (evmNetworkId: string) =>
  (await fetchEvmNetworks()).find(({ id }) => id === evmNetworkId)

export const fetchTokens = async () => await fetchInitTokens()

export const fetchMiniMetadatas = async () => await fetchInitMiniMetadatas()
