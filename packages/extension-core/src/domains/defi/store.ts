import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, ReplaySubject, skip } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { DefiPosition } from "./types"

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
  .subscribe((positions) => {
    blobStore.set({ positions })
  })

const getPositionId = (position: DefiPosition) =>
  `${position.networkId}-${position.address}-${position.defiId}`

export const defiPositionsStore$ = subjectDefiPositionsStore$.asObservable()

export const updateDefiPositionsStore = (positions: DefiPosition[]) => {
  subjectDefiPositionsStore$.next(
    // consistent ordering ensures we can compare changes easily
    positions.concat().sort((a, b) => getPositionId(a).localeCompare(getPositionId(b))),
  )
}
