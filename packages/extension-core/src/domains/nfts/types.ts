import { RequestIdOnly } from "../../types/base"
import { NftStoreData } from "./store"

export type RefreshNftMetadataRequestBody = {
  evmNetworkId: string
  contractAddress: string
  tokenId: string
}

/**
 * Types in this section should be kept in sync with the ones from asset-discovery-api
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
  audioUrl: string | null
  name: string
  contract: string
  marketplaceUrls: string[] | null
  traits: object | null
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
  marketplaceUrls: string[] | null
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
