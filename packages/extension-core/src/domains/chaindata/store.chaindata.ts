import { ChaindataStorage } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, ReplaySubject, skip } from "rxjs"

import { getDbBlob, updateDbBlob } from "../../db"

const BLOB_ID = "chaindata" as const
type ChaindataBlobData = ChaindataStorage & { id: typeof BLOB_ID }
const getChaindataDbBlob = getDbBlob<typeof BLOB_ID, ChaindataBlobData>(BLOB_ID)

const DEFAULT_DATA: ChaindataStorage = {
  networks: [],
  tokens: [],
  miniMetadatas: [],
}

// chaindata storage
export const chaindataStorage$ = new ReplaySubject<ChaindataStorage>(1)

// persist store to db on changes
chaindataStorage$
  .pipe(skip(1), debounceTime(2_000), distinctUntilChanged<ChaindataStorage>(isEqual))
  .subscribe((storage) => {
    log.debug(
      `[chaindata] updating db blob with data (networks:${storage.networks.length}, tokens:${storage.tokens.length}, meta:${storage.miniMetadatas.length})`,
    )
    updateDbBlob(BLOB_ID, { id: BLOB_ID, ...storage })
  })

// load store from db on startup
getChaindataDbBlob
  .then((blobData) => {
    if (!blobData) return chaindataStorage$.next(DEFAULT_DATA)

    const { id: _, ...chaindata } = blobData

    chaindataStorage$.next({
      ...DEFAULT_DATA,
      ...chaindata,
    })
  })
  .catch((error) => {
    log.error("[chaindata] failed to load chaindata store on startup", error)
    // need at least one emit on startup as it's a replay subject
    chaindataStorage$.next(DEFAULT_DATA)
  })
