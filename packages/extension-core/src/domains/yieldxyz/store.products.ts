import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, map, pairwise, ReplaySubject, tap } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { YieldDto } from "./types"

const blobStore = getBlobStore<YieldDto[]>("yieldxyz-products")

const DEFAULT_DATA: YieldDto[] = []

const subjectYieldxyzProductsStore$ = new ReplaySubject<YieldDto[]>(1)
walletReady.then(async () => {
  try {
    const data = await blobStore.get()
    subjectYieldxyzProductsStore$.next(data ?? DEFAULT_DATA)
  } catch (error) {
    log.error("[yield.xyz] Error fetching yield products:", error)
    subjectYieldxyzProductsStore$.next(DEFAULT_DATA)
  }
})

// normalize function to order items consistently, so we can use isEqual reliably
const normalizeYieldxyzProducts = (items: YieldDto[]): YieldDto[] => {
  return items.concat().sort((a, b) => a.id.localeCompare(b.id))
}

// persist to db when store is updated
subjectYieldxyzProductsStore$
  .pipe(debounceTime(500), map(normalizeYieldxyzProducts), pairwise())
  .subscribe(async ([prev, items]) => {
    try {
      if (!isEqual(prev, items)) await blobStore.set(items)
    } catch (error) {
      log.error("[yield.xyz] Error saving yield products:", error)
    }
  })

export const yieldxyzProductsStore$ = subjectYieldxyzProductsStore$
  .asObservable()
  .pipe(tap((val) => log.debug("[yield.xyz] yieldxyzProductsStore$ emitted", val)))

export const updateYieldxyzProductsStore = (items: YieldDto[]) => {
  subjectYieldxyzProductsStore$.next(items)
}
