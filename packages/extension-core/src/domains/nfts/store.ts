import { BehaviorSubject, debounceTime } from "rxjs"

import { getDbBlob, updateDbBlob } from "../../db"
import { Nft, NftCollection } from "./types"

export type NftStoreData = {
  id: "nfts"
  accountsKey: string
  networksKey: string
  timestamp: number | null
  collections: NftCollection[]
  nfts: Nft[]
  hiddenNftCollectionIds: string[]
  favoriteNftIds: string[]
}

const DEFAULT_DATA: NftStoreData = {
  id: "nfts",
  accountsKey: "",
  networksKey: "",
  timestamp: null,
  collections: [],
  nfts: [],
  hiddenNftCollectionIds: [],
  favoriteNftIds: [],
}

// this must not be exported at the package level
// only backend should have access to it
export const nftsStore$ = new BehaviorSubject(DEFAULT_DATA)

// load from db and cleanup on startup
getDbBlob<"nfts", NftStoreData>("nfts").then((nfts) => {
  if (nfts) nftsStore$.next({ ...DEFAULT_DATA, ...nfts })
})

// persist to db when store is updated
nftsStore$.pipe(debounceTime(1_000)).subscribe((nfts) => {
  updateDbBlob("nfts", nfts)
})
