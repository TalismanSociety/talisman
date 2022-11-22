import { mockChainsResponse, mockEvmNetworksResponse, mockTokensResponse } from "./_mockData"

export async function fetchChains() {
  return mockChainsResponse
}
export async function fetchEvmNetworks() {
  return mockEvmNetworksResponse
}
export async function fetchTokens() {
  return mockTokensResponse
}
