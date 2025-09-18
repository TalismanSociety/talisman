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
  tokenSymbol?: string
  networkName?: string
  protocolIds?: string[]
}
