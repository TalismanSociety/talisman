import { log } from "@common/log"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, ReplaySubject, skip } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import type { DefiPosition } from "./types"

type DefiPositionsStoreData = {
  positions: DefiPosition[]
}

const blobStore = getBlobStore<DefiPositionsStoreData>("defi-positions")

const DEFAULT_DATA: DefiPosition[] = []

const subjectDefiPositionsStore$ = new ReplaySubject<DefiPosition[]>(1)

walletReady.then(async () => {
  try {
    const data = await blobStore.get()
    subjectDefiPositionsStore$.next(data ? data.positions : DEFAULT_DATA)
  } catch (error) {
    log.error("Error fetching defi positions:", error)
    subjectDefiPositionsStore$.next(DEFAULT_DATA)
  }
})

// persist to db when store is updated
subjectDefiPositionsStore$
  .pipe(skip(1), debounceTime(2_000), distinctUntilChanged(isEqual))
  .subscribe(async (positions) => {
    try {
      await blobStore.set({ positions })
    } catch (error) {
      log.error("Error saving defi positions:", error)
    }
  })

const getPositionId = (position: DefiPosition) =>
  `${position.networkId}-${position.address}-${position.defiId}`

export const defiPositionsStore$ = subjectDefiPositionsStore$.asObservable()

export const updateDefiPositionsStore = (positions: DefiPosition[]) => {
  subjectDefiPositionsStore$.next(
    // consistent ordering ensures we can compare changes easily
    positions.concat().sort((a, b) => getPositionId(a).localeCompare(getPositionId(b)))
  )
}
