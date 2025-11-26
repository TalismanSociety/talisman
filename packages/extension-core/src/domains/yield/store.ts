import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, map, pairwise, ReplaySubject } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { YieldPosition } from "./types"

const blobStore = getBlobStore<YieldPosition[]>("yield-balances")

const DEFAULT_DATA: YieldPosition[] = []

const subjectYieldPositionsStore$ = new ReplaySubject<YieldPosition[]>(1)

walletReady.then(async () => {
  try {
    const data = await blobStore.get()
    subjectYieldPositionsStore$.next(data ?? DEFAULT_DATA)
  } catch (error) {
    log.error("[yield.xyz] Error fetching yield balances:", error)
    subjectYieldPositionsStore$.next(DEFAULT_DATA)
  }
})

// normalize function to order items consistently, so we can use isEqual reliably
const normalizeYieldPositions = (items: YieldPosition[]): YieldPosition[] => {
  return (
    items
      ?.map((p) => ({
        ...p,
        balances: p.balances.sort((a, b) => {
          if (a.address !== b.address) return a.address.localeCompare(b.address)
          if (a.token.address !== b.token.address)
            return (a.token.address ?? "").localeCompare(b.token.address ?? "")
          if (a.date !== b.date) return (a.date ?? "").localeCompare(b.date ?? "")
          if (a.validator !== b.validator)
            return (a.validator?.address ?? "").localeCompare(b.validator?.address ?? "")
          log.warn("Cannot sort yield position balances:", { a, b })
          return 0
        }),
      }))
      .sort((a, b) => a.yieldId.localeCompare(b.yieldId)) || []
  )
}

// persist to db when store is updated
subjectYieldPositionsStore$
  .pipe(debounceTime(500), map(normalizeYieldPositions), pairwise())
  .subscribe(async ([prev, items]) => {
    try {
      if (!isEqual(prev, items)) await blobStore.set(items)
    } catch (error) {
      log.error("[yield.xyz] Error saving yield balances:", error)
    }
  })

export const yieldPositionsStore$ = subjectYieldPositionsStore$.asObservable()

export const updateYieldPositionsStore = (items: YieldPosition[]) => {
  subjectYieldPositionsStore$.next(items)
}
