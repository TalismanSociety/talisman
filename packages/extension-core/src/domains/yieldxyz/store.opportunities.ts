import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, map, pairwise, ReplaySubject } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { YieldDto } from "./types"

const blobStore = getBlobStore<YieldDto[]>("yieldxyz-opportunities")

const DEFAULT_DATA: YieldDto[] = []

const subjectYieldxyzOpportunitiesStore$ = new ReplaySubject<YieldDto[]>(1)
walletReady.then(async () => {
  try {
    const data = await blobStore.get()
    subjectYieldxyzOpportunitiesStore$.next(data ?? DEFAULT_DATA)
  } catch (error) {
    log.error("[yield.xyz] Error fetching yield opportunities:", error)
    subjectYieldxyzOpportunitiesStore$.next(DEFAULT_DATA)
  }
})

// normalize function to order items consistently, so we can use isEqual reliably
const normalizeYieldxyzPositions = (items: YieldDto[]): YieldDto[] => {
  return items.concat().sort((a, b) => a.id.localeCompare(b.id))
}

// persist to db when store is updated
subjectYieldxyzOpportunitiesStore$
  .pipe(debounceTime(500), map(normalizeYieldxyzPositions), pairwise())
  .subscribe(async ([prev, items]) => {
    try {
      if (!isEqual(prev, items)) await blobStore.set(items)
    } catch (error) {
      log.error("[yield.xyz] Error saving yield opportunities:", error)
    }
  })

export const yieldxyzOpportunitiesStore$ = subjectYieldxyzOpportunitiesStore$.asObservable()

export const updateYieldxyzOpportunitiesStore = (items: YieldDto[]) => {
  subjectYieldxyzOpportunitiesStore$.next(items)
}
