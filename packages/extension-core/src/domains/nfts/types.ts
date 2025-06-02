import { RequestIdOnly } from "../../types/base"

export type RefreshNftMetadataRequestBody = {
  evmNetworkId: string
  contractAddress: string
  tokenId: string
}

/**
 * Types in this section should be kept in sync with the ones from asset-discovery-api
 */

export type AccountNft = {
  id: string
  collectionId: string
  tokenId: string
  networkId: string
  type: string // 'ERC721' | 'ERC1155' | 'Polkadot'
  previewUrl: string | null
  imageUrl: string | null
  videoUrl: string | null
  audioUrl: string | null
  name: string
  contract: string | null
  nftCollectionId: string | null // used on solana and polkadot
  marketplaceUrls: string[] | null
  traits: object | null
  price: number | null
  owner: string
  amount: number
  description: string | null
  updatedAt: number | null
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

export type AccountNfts = { nfts: AccountNft[]; collections: NftCollection[] }

export type Nft = Omit<AccountNft, "amount" | "owner"> & {
  owners: Record<string, number>
}

/**
 * Types below are local to the wallet
 */

export type NftLoadingStatus = "stale" | "loading" | "loaded"

export type NftData = {
  status: NftLoadingStatus
  nfts: Nft[]
  collections: NftCollection[]
  hiddenNftCollectionIds: string[]
  favoriteNftIds: string[]
}

export type SetHiddenNftCollectionRequest = { id: string; isHidden: boolean }
export type SetFavoriteNftRequest = { id: string; isFavorite: boolean }

export interface NftsMessages {
  "pri(nfts.subscribe)": [null, boolean, NftData]
  "pri(nfts.collection.setHidden)": [SetHiddenNftCollectionRequest, boolean]
  "pri(nfts.setFavorite)": [SetFavoriteNftRequest, boolean]
  "pri(nfts.refreshMetadata)": [RequestIdOnly, boolean]
}
