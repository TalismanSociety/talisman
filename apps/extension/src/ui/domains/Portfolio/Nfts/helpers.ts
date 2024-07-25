import { Nft, NftCollection } from "extension-core"

export const getPortfolioNftPreviewUrl = (nft: Nft, collection?: NftCollection) => {
  if (nft.previews.small) return nft.previews.small
  if (nft.imageUrl) return nft.imageUrl
  if (collection?.imageUrl) return collection.imageUrl
  return null
}

export const getPortfolioNftCollectionPreviewUrl = (collection: NftCollection, nfts: Nft[]) => {
  const collectionNfts = nfts.filter((nft) => nft.collectionId === collection.id)

  // TODO pick favorite if any
  // if user has only 1 NFT in that collection, use it as the image
  if (collectionNfts.length) return getPortfolioNftPreviewUrl(collectionNfts[0], collection)

  return collection.imageUrl
}
