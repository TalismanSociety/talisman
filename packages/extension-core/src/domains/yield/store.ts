import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, ReplaySubject, skip } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { YieldPositionItem } from "./types"

// Data version to force refresh on schema changes
const YIELD_DATA_VERSION = 3

type YieldBalancesStoreData = {
  version?: number
  items: YieldPositionItem[]
}

const blobStore = getBlobStore<YieldBalancesStoreData>("yield-balances")

const DEFAULT_DATA: YieldPositionItem[] = []

const subjectYieldBalancesStore$ = new ReplaySubject<YieldPositionItem[]>(1)

// Check if stored data version matches current version
const checkVersion = (data: YieldBalancesStoreData | null): boolean => {
  if (!data) return false
  return data.version === YIELD_DATA_VERSION
}

walletReady.then(async () => {
  try {
    const data = await blobStore.get()

    // Force refresh if version mismatch
    if (!checkVersion(data)) {
      log.log("Yield data version mismatch, clearing cache")
      await blobStore.set({ items: [], version: YIELD_DATA_VERSION })
      subjectYieldBalancesStore$.next(DEFAULT_DATA)
      return
    }

    subjectYieldBalancesStore$.next(data ? data.items : DEFAULT_DATA)
  } catch (error) {
    log.error("Error fetching yield balances:", error)
    subjectYieldBalancesStore$.next(DEFAULT_DATA)
  }
})

// persist to db when store is updated
subjectYieldBalancesStore$
  .pipe(skip(1), debounceTime(200), distinctUntilChanged<YieldPositionItem[]>(isEqual))
  .subscribe((items) => {
    blobStore.set({ version: YIELD_DATA_VERSION, items })
  })

export const yieldBalancesStore$ = subjectYieldBalancesStore$.asObservable()

export const updateYieldBalancesStore = (items: YieldPositionItem[]) => {
  subjectYieldBalancesStore$.next(items)
}
