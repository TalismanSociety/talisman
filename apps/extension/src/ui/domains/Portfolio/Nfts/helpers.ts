import { isNotNil } from "@talismn/util"
import { Nft, NftCollection } from "extension-core"

export const getPortfolioNftCollectionPreviewUrl = (collection: NftCollection, nfts: Nft[]) => {
  const collectionNfts = nfts.filter((nft) => nft.collectionId === collection.id)

  // if user has only 1 NFT in that collection, use it as the image
  if (collectionNfts.length === 1) return collectionNfts[0].previewUrl

  return collection.iconUrl ?? collection.bannerUrl ?? collectionNfts[0].previewUrl
}

export const getNftQuantity = (nft: Nft, owner?: string) => {
  return Object.entries(nft.owners)
    .filter(([address]) => !owner || owner === address)
    .reduce((acc, [, count]) => acc + count, 0)
}

export const getNftCollectionLastUpdatedAt = (
  collection: NftCollection,
  nfts: Nft[],
  owner?: string,
): number | null => {
  const timestamps = nfts
    .filter((n) => !owner || !!n.owners[owner])
    .filter((nft) => nft.collectionId === collection.id)
    .map((nfts) => nfts.updatedAt)
    .filter(isNotNil)

  return timestamps.length ? Math.max(...timestamps) : null
}
