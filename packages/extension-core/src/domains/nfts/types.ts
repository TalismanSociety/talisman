import { NftStoreData } from "./store"

/**
 * Types in this section should be kept in sync with the ones from talisman-nfts-api
 */
export type NftCollectionMarketplace = {
  name: string
  url: string
  floorUsd: number | null
  floorTokens: {
    plancks: number
    symbol: string
    decimals: number
  } | null
}

export type NftProperty = {
  name: string
  value: string
}

export type NftCollection = {
  id: string
  name: string | null
  description: string | null
  imageUrl: string | null
  bannerUrl: string | null
  marketplaces: NftCollectionMarketplace[]
  distinctOwners: number
  distinctNfts: number
  totalQuantity: number
  evmNetworkIds: string[]
}

export type Nft = {
  id: string
  collectionId: string
  evmNetworkId: string
  contractAddress: string
  name: string | null
  description: string | null
  imageUrl: string | null
  owner: string | null
  properties: NftProperty[]
  previews: {
    small: string | null
    medium: string | null
    large: string | null
    color: string | null
  }
  acquiredAt: string | null
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
