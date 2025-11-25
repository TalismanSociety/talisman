import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, map, pairwise, ReplaySubject } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { YieldPositionItem } from "./types"

type YieldBalancesStoreData = {
  items: YieldPositionItem[]
}

const blobStore = getBlobStore<YieldBalancesStoreData>("yield-balances")

const DEFAULT_DATA: YieldPositionItem[] = []

const subjectYieldBalancesStore$ = new ReplaySubject<YieldPositionItem[]>(1)

// Initialize store immediately with default data
subjectYieldBalancesStore$.next(DEFAULT_DATA)

walletReady.then(async () => {
  try {
    const data = await blobStore.get()
    subjectYieldBalancesStore$.next(data ? data.items : DEFAULT_DATA)
  } catch (error) {
    log.error("Error fetching yield balances:", error)
    subjectYieldBalancesStore$.next(DEFAULT_DATA)
  }
})

// TODO: normalize function to order items consistently
const normalizeYieldBalances = (items: YieldPositionItem[]): YieldPositionItem[] => {
  return items?.concat().sort((a, b) => a.yieldId.localeCompare(b.yieldId)) || []
}

// persist to db when store is updated
subjectYieldBalancesStore$
  .pipe(debounceTime(500), map(normalizeYieldBalances), pairwise())
  .subscribe(([prev, items]) => {
    if (!isEqual(prev, items)) blobStore.set({ items })
  })

export const yieldBalancesStore$ = subjectYieldBalancesStore$.asObservable()

export const updateYieldBalancesStore = (items: YieldPositionItem[]) => {
  subjectYieldBalancesStore$.next(items)
}
