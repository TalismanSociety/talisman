import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, ReplaySubject, skip } from "rxjs"

import { DbBlobId, getDbBlob, updateDbBlob } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { DefiPosition } from "./types"

const BLOB_ID: DbBlobId = "defi-positions"

// TODO refactor getDbBlob so we dont need this useless type
type DefiPositionsStoreData = {
  /// id: "defi-positions"
  positions: DefiPosition[]
}

const DEFAULT_DATA: DefiPosition[] = []

const subjectDefiPositionsStore$ = new ReplaySubject<DefiPosition[]>(1)

walletReady.then(async () => {
  try {
    const data = await getDbBlob<DefiPositionsStoreData>(BLOB_ID)
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
    updateDbBlob<DefiPositionsStoreData>("defi-positions", {
      positions,
    })
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
