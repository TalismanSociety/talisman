export type YieldProduct = {
  id: string
  name: string
  description: string
  apy: number
  tvl: string
  protocolLogo: string | null
}

export type YieldProductsFilter = {
  tokenId?: string
  networkId?: string
  protocolIds?: string[]
}
