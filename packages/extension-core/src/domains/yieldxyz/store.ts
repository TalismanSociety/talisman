import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, map, pairwise, ReplaySubject } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { YieldxyzPosition } from "./types"

const blobStore = getBlobStore<YieldxyzPosition[]>("yieldxyz-positions")

const DEFAULT_DATA: YieldxyzPosition[] = []

const subjectYieldxyzPositionsStore$ = new ReplaySubject<YieldxyzPosition[]>(1)

walletReady.then(async () => {
  try {
    const data = await blobStore.get()
    subjectYieldxyzPositionsStore$.next(data ?? DEFAULT_DATA)
  } catch (error) {
    log.error("[yield.xyz] Error fetching yield balances:", error)
    subjectYieldxyzPositionsStore$.next(DEFAULT_DATA)
  }
})

// normalize function to order items consistently, so we can use isEqual reliably
const normalizeYieldxyzPositions = (items: YieldxyzPosition[]): YieldxyzPosition[] => {
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
subjectYieldxyzPositionsStore$
  .pipe(debounceTime(500), map(normalizeYieldxyzPositions), pairwise())
  .subscribe(async ([prev, items]) => {
    try {
      if (!isEqual(prev, items)) await blobStore.set(items)
    } catch (error) {
      log.error("[yield.xyz] Error saving yield balances:", error)
    }
  })

export const yieldxyzPositionsStore$ = subjectYieldxyzPositionsStore$.asObservable()

export const updateYieldxyzPositionsStore = (items: YieldxyzPosition[]) => {
  subjectYieldxyzPositionsStore$.next(items)
}
