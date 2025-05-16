import { RequestIdOnly } from "../../types/base"
import { NftStoreData } from "./store"

/**
 * Types in this section should be kept in sync with the ones from talisman-nfts-api
 */
// export type NftCollectionMarketplace = {
//   name: string
//   url: string
//   floorUsd: number | null
//   floorTokens: {
//     plancks: number
//     symbol: string
//     decimals: number
//   } | null
// }

// export type NftMarketplaceInfo = {
//   name: string
//   url: string
// }

// export type NftProperty = {
//   name: string
//   value: string
// }

// export type NftCollection = {
//   id: string
//   name: string | null
//   description: string | null
//   imageUrl: string | null
//   bannerUrl: string | null
//   marketplaces: NftCollectionMarketplace[]
//   distinctOwners: number
//   distinctNfts: number
//   totalQuantity: number
//   evmNetworkIds: string[]
// }

// export type Nft = {
//   id: string
//   tokenId: string
//   collectionId: string
//   evmNetworkId: string
//   contract: {
//     address: string
//     type: string | null
//     name: string | null
//     symbol: string | null
//   }
//   name: string | null
//   description: string | null
//   imageUrl: string | null
//   videoUrl: string | null
//   audioUrl: string | null
//   modelUrl: string | null
//   otherUrl: string | null
//   properties: NftProperty[]
//   previews: {
//     small: string | null
//     medium: string | null
//     large: string | null
//     color: string | null
//   }
//   marketplaces: NftMarketplaceInfo[]
//   owners: {
//     address: string
//     quantity: number
//     acquiredAt: string
//   }[]
// }

// export type FetchNftsRequestBody = {
//   addresses: string[]
//   evmNetworkIds: string[]
// }

// export type FetchNftsResponse = {
//   collections: NftCollection[]
//   nfts: Nft[]
// }

export type RefreshNftMetadataRequestBody = {
  evmNetworkId: string
  contractAddress: string
  tokenId: string
}

/**
 * Types in this section should be kept in sync with the ones from talisman-nfts-api
 */
type NftBase = {
  id: string
  collectionId: string
  tokenId: string
  networkId: string
  type: string // 'ERC721' | 'ERC1155'
  previewUrl: string
  imageUrl: string | null
  videoUrl: string | null
  name: string
  contract: string
}

export type Nft = NftBase & {
  owners: Record<string, number>
}

export type NftCollection = {
  id: string
  name: string
  description: string
  iconUrl: string | null
  bannerUrl: string | null
  itemsCount: number | null
  ownersCount: number | null
}

export type FetchNftsRequest = { addresses: string[] }

export type FetchNftsResponse = { nfts: Nft[]; collections: NftCollection[] }

/**
 * Types below are local to the wallet
 */
export type NftLoadingStatus = "stale" | "loading" | "loaded"

export type NftData = Omit<NftStoreData, "id" | "accountsKey" | "networksKey"> & {
  status: NftLoadingStatus
}

export type SetHiddenNftCollectionRequest = { id: string; isHidden: boolean }
export type SetFavoriteNftRequest = { id: string; isFavorite: boolean }

export interface NftsMessages {
  "pri(nfts.subscribe)": [null, boolean, NftData]
  "pri(nfts.collection.setHidden)": [SetHiddenNftCollectionRequest, boolean]
  "pri(nfts.setFavorite)": [SetFavoriteNftRequest, boolean]
  "pri(nfts.refreshMetadata)": [RequestIdOnly, boolean]
}
