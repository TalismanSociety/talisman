import { Nft, NftCollection } from "extension-core"

export const getPortfolioNftCollectionPreviewUrl = (collection: NftCollection, nfts: Nft[]) => {
  const collectionNfts = nfts.filter((nft) => nft.collectionId === collection.id)

  // if user has only 1 NFT in that collection, use it as the image
  if (collectionNfts.length === 1) return collectionNfts[0].previewUrl

  return collection.iconUrl
}

export const getNftLastAcquiredAt = (_nft: Nft, _owner?: string): string => {
  // TODO
  return "0"
  // return nft.owners
  //   .filter((o) => !owner || owner === o.address)
  //   .sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))[0].acquiredAt
}

export const getNftQuantity = (nft: Nft, owner?: string) => {
  return Object.entries(nft.owners)
    .filter(([address]) => !owner || owner === address)
    .reduce((acc, [, count]) => acc + count, 0)
}

export const getNftCollectionLastAcquiredAt = (
  _collection: NftCollection,
  _nfts: Nft[],
  _owner?: string,
): string => {
  // TODO
  return "0"
  // const collectionNfts = nfts.filter((nft) => nft.collectionId === collection.id)
  // if (!collectionNfts.length) return null

  // return collectionNfts
  //   .sort(sortByLastAcquisitionDate)[0]
  //   .owners.filter((o) => !owner || owner === o.address)
  //   .sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))[0].acquiredAt
}
