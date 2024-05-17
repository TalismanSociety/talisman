export type NftCollectionMarketplace = {
  name: string
  url: string
}

export type NftProperty = {
  name: string
  value: string
}

export type NftCollection = {
  id: string
  evmNetworkId: string
  name: string
  description: string
  imageUrl: string
  marketplaces: NftCollectionMarketplace[]
}

export type Nft = {
  id: string
  collectionId: string
  name: string
  description: string
  imageUrl: string
  owner: string
  marketplaces: NftCollectionMarketplace[]
}
