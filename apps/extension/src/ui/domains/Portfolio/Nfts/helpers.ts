import type { Nft, NftCollection } from "@core/domains/nfts/exports"
import { isNotNil } from "@talismn/util"

export const getPortfolioNftCollectionPreview = (collection: NftCollection, nfts: Nft[]) => {
  const collectionNfts = nfts.filter((nft) => nft.collectionId === collection.id)
  const [firstNft] = collectionNfts

  // if user has only 1 NFT in that collection, use it as the image
  if (collectionNfts.length === 1)
    return { url: firstNft.previewUrl, isPending: !!firstNft.isMetadataPending }

  return {
    url: collection.iconUrl ?? collection.bannerUrl ?? firstNft.previewUrl,
    isPending: !!collection.isMetadataPending || !!firstNft.isMetadataPending,
  }
}

export const getNftQuantity = (nft: Nft, owner?: string) => {
  return Object.entries(nft.owners)
    .filter(([address]) => !owner || owner === address)
    .reduce((acc, [, count]) => acc + count, 0)
}

export const getNftCollectionLastUpdatedAt = (
  collection: NftCollection,
  nfts: Nft[],
  owner?: string
): number | null => {
  const timestamps = nfts
    .filter((n) => !owner || !!n.owners[owner])
    .filter((nft) => nft.collectionId === collection.id)
    .map((nfts) => nfts.updatedAt)
    .filter(isNotNil)

  return timestamps.length ? Math.max(...timestamps) : null
}
