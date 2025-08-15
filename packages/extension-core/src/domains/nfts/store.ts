import { BehaviorSubject, debounceTime } from "rxjs"

import { getBlobStore } from "../../db"
import { Nft, NftCollection } from "./types"

export type NftStoreData = {
  accountsKey: string
  networksKey: string
  timestamp: number | null
  collections: NftCollection[]
  nfts: Nft[]
  hiddenNftCollectionIds: string[]
  favoriteNftIds: string[]
}

const DEFAULT_DATA: NftStoreData = {
  accountsKey: "",
  networksKey: "",
  timestamp: null,
  collections: [],
  nfts: [],
  hiddenNftCollectionIds: [],
  favoriteNftIds: [],
}

const blobStore = getBlobStore<NftStoreData>("nfts")

// this must not be exported at the package level
// only backend should have access to it
export const nftsStore$ = new BehaviorSubject(DEFAULT_DATA)

// load from db and cleanup on startup
blobStore.get().then((nfts) => {
  if (nfts) nftsStore$.next({ ...DEFAULT_DATA, ...nfts })
})

// persist to db when store is updated
nftsStore$.pipe(debounceTime(1_000)).subscribe((nfts) => {
  blobStore.set(nfts)
})
