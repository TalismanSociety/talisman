import { normalizeAddress } from "@talismn/crypto"
import { isEqual, uniq } from "lodash"
import { BehaviorSubject, debounceTime } from "rxjs"

import { getDbBlob, updateDbBlob } from "../../db"
import { AccountNft, NftCollection } from "./types"

export type NftStoreData = {
  id: "nfts"
  // accountsKey: string
  // networksKey: string
  // timestamp: number | null
  collections: NftCollection[]
  nfts: AccountNft[]
  hiddenNftCollectionIds: string[]
  favoriteNftIds: string[]
}

const DEFAULT_DATA: NftStoreData = {
  id: "nfts",
  // accountsKey: "",
  // networksKey: "",
  // timestamp: null,
  collections: [],
  nfts: [],
  hiddenNftCollectionIds: [],
  favoriteNftIds: [],
}

// this must not be exported at the package level
// only backend should have access to it
const subject = new BehaviorSubject(DEFAULT_DATA)

// load from db and cleanup on startup
getDbBlob<"nfts", NftStoreData>("nfts").then((nfts) => {
  if (nfts) subject.next({ ...DEFAULT_DATA, ...nfts })
})

// persist to db when store is updated
subject.pipe(debounceTime(1_000)).subscribe((nfts) => {
  updateDbBlob("nfts", nfts)
})

export const nftsStore$ = subject.asObservable()

export const updateNftsStore = ({
  addresses,
  nfts,
  collections,
}: {
  addresses: string[]
  nfts: AccountNft[]
  collections: NftCollection[]
}) => {
  const normalizedAddresses = addresses.map(normalizeAddress)
  const newStoreData = structuredClone(subject.value)
  const newCollectionsIds = uniq(collections.map((c) => c.id))

  newStoreData.nfts = newStoreData.nfts
    .filter((nft) => !normalizedAddresses.includes(normalizeAddress(nft.owner)))
    .concat(nfts)
  newStoreData.collections = newStoreData.collections
    .filter((col) => !newCollectionsIds.includes(col.id))
    .concat(collections)
    // cleanup unused collections
    .filter((col) => newStoreData.nfts.some((nft) => nft.collectionId === col.id))

  // cleanup orphan nfts
  newStoreData.nfts.filter((nft) =>
    newStoreData.collections.some((col) => col.id === nft.collectionId),
  )

  if (!isEqual(subject.value, newStoreData)) {
    subject.next(newStoreData)
  }
}

export const setHiddenNftCollection = (id: string, isHidden: boolean) => {
  const hiddenNftCollectionIds = subject.value.hiddenNftCollectionIds.filter((cid) => cid !== id)
  if (isHidden) hiddenNftCollectionIds.push(id)

  subject.next({
    ...subject.value,
    hiddenNftCollectionIds,
  })
}

export const setFavoriteNft = (id: string, isFavorite: boolean) => {
  const favoriteNftIds = subject.value.favoriteNftIds.filter((nid) => nid !== id)
  if (isFavorite) favoriteNftIds.push(id)

  subject.next({
    ...subject.value,
    favoriteNftIds,
  })
}

// nftsStore$.subscribe((store) => {
//   console.log("[nfts] store updated:", store)
// })
