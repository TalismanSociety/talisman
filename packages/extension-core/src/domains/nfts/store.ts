import { BehaviorSubject, debounceTime } from "rxjs"

import { getDbBlob, updateDbBlob } from "../../db"
import { Nft, NftCollection } from "./types"

export type NftStoreData = {
  id: "nfts"
  accountsKey: string
  timestamp: number | null
  collections: NftCollection[]
  nfts: Nft[]
}

const DEFAULT_DATA: NftStoreData = {
  id: "nfts",
  accountsKey: "",
  timestamp: null,
  collections: [],
  nfts: [],
}

// this must not be exported at the package level
// only backend should have access to it
export const nftsStore = new BehaviorSubject(DEFAULT_DATA)

// load from db on startup
getDbBlob<"nfts", NftStoreData>("nfts").then((nfts) => {
  if (nfts) nftsStore.next(nfts)
})

// persist to db when store is updated
nftsStore.pipe(debounceTime(1_000)).subscribe((nfts) => {
  updateDbBlob("nfts", nfts)
})
