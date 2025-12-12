import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, map, pairwise, ReplaySubject } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { BalanceDto, YieldxyzPosition } from "./types"

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
          const getSortKey = (balance: BalanceDto) =>
            [
              balance.address,
              balance.type,
              balance.validator?.address,
              balance.validators?.map((v) => v.address).join(","),
              balance.token.symbol,
              balance.token.address,
              balance.amountRaw,
            ].join("::")
          const s1 = getSortKey(a)
          const s2 = getSortKey(b)
          if (s1 === s2) log.warn("Cannot sort yield position balances:", { a, b })
          return s1.localeCompare(s2)
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
