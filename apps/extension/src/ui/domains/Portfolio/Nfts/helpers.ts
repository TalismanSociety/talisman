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

const sortByLastAcquisitionDate = (nft1: Nft, nft2: Nft) => {
  const lastAcquired1 = getNftLastAcquiredAt(nft1)
  const lastAcquired2 = getNftLastAcquiredAt(nft2)

  return lastAcquired2.localeCompare(lastAcquired1)
}

export const getNftLastAcquiredAt = (nft: Nft, owner?: string) => {
  return nft.owners
    .filter((o) => !owner || owner === o.address)
    .sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))[0].acquiredAt
}

export const getNftQuantity = (nft: Nft, owner?: string) => {
  return nft.owners
    .filter((o) => !owner || owner === o.address)
    .reduce((acc, o) => acc + o.quantity, 0)
}

export const getNftCollectionFloorUsd = (collection: NftCollection): number | null => {
  return (
    collection.marketplaces
      .filter((m) => m.floorUsd)
      .map((mp) => mp.floorUsd ?? 0)
      .sort((a, b) => a - b)[0] ?? null
  )
}

export const getNftCollectionLastAcquiredAt = (
  collection: NftCollection,
  nfts: Nft[],
  owner?: string
) => {
  const collectionNfts = nfts.filter((nft) => nft.collectionId === collection.id)
  if (!collectionNfts.length) return null

  return collectionNfts
    .sort(sortByLastAcquisitionDate)[0]
    .owners.filter((o) => !owner || owner === o.address)
    .sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))[0].acquiredAt
}
