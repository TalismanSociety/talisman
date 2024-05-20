import { NftStoreData } from "./store"

/**
 * Types in this section should be kept in sync with the ones from talisman-nfts-api
 */
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
  properties: NftProperty[]
}

export type FetchNftsRequestBody = {
  addresses: string[]
}

export type FetchNftsResponse = {
  collections: NftCollection[]
  nfts: Nft[]
}

/**
 * Types below are local to the wallet
 */
export type NftLoadingStatus = "stale" | "loading" | "loaded"

export type NftData = Omit<NftStoreData, "id" | "accountsKey"> & {
  status: NftLoadingStatus
}

export interface NftsMessages {
  "pri(nfts.subscribe)": [null, boolean, NftData]
}
