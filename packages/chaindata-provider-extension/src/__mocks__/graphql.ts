import { mockChainsResponse, mockEvmNetworksResponse, mockTokensResponse } from "./_mockData"

export const fetchChains = async () => mockChainsResponse

export const fetchEvmNetworks = async () => mockEvmNetworksResponse
export const fetchEvmNetwork = async (evmNetworkId: string) =>
  mockEvmNetworksResponse.find(({ id }) => id === evmNetworkId)

export const fetchTokens = async () => mockTokensResponse
export const fetchToken = async (tokenId: string) =>
  mockTokensResponse.find(({ id }) => id === tokenId)?.data
