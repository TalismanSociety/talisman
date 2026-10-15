import { uniq } from "lodash-es"

import { getBlobStore } from "../../../db"
import { type Migration, MigrationFunction } from "../../../libs/migrations/types"
import type { NftStoreData } from "../store"

const SUBSCAN_ID = /^subscan:([^:]+):(\d+)(?::(\d+))?$/

const isSubscanId = (id: string) => id.startsWith("subscan:")

const toSubstrateNftsId = (id: string) => {
  const [, networkId, collection, item] = SUBSCAN_ID.exec(id) ?? []
  return networkId ? `substrate:${networkId}:Nfts:${collection}${item ? `:${item}` : ""}` : id
}

const replaceSubscanIds = (ids: string[] = []) =>
  uniq(ids.map(toSubstrateNftsId)).filter((id) => !isSubscanId(id))

const dropSubscanData = (data: Partial<NftStoreData>): Partial<NftStoreData> => ({
  ...data,
  collections: data.collections?.filter((collection) => !isSubscanId(collection.id)),
  nfts: data.nfts?.filter((nft) => !isSubscanId(nft.id)),
  hiddenNftCollectionIds: replaceSubscanIds(data.hiddenNftCollectionIds),
  favoriteNftIds: replaceSubscanIds(data.favoriteNftIds),
})

// substrate nfts moved from subscan ids to on-chain ids: keep hidden collections and favourites
export const migrateNftsV3: Migration = {
  forward: new MigrationFunction(async () => {
    const blobStore = getBlobStore<Partial<NftStoreData>>("nfts")
    const data = await blobStore.get()
    if (data) await blobStore.set(dropSubscanData(data))
  }),
  // no way back
}
