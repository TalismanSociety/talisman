import { BehaviorSubject } from "rxjs"

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
