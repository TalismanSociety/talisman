import { ChaindataStorage } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, Observable } from "rxjs"

import { getDbBlob, updateDbBlob } from "../../db"

const BLOB_ID = "chaindata" as const
type ChaindataBlobData = ChaindataStorage & { id: typeof BLOB_ID }
const getChaindataDbBlob = getDbBlob<typeof BLOB_ID, ChaindataBlobData>(BLOB_ID)

export const loadChaindataPersistedStorage = async (): Promise<ChaindataStorage | undefined> => {
  try {
    const blobData = await getChaindataDbBlob
    if (!blobData) return

    const { id: _, ...storage } = blobData
    return storage
  } catch (error) {
    log.error("[chaindata] failed to load chaindata store on startup", error)
    return
  }
}

export const streamChaindataStorageChangesToDisk = (storage$: Observable<ChaindataStorage>) => {
  // persist store to db on changes
  storage$.pipe(debounceTime(2_000), distinctUntilChanged(isEqual)).subscribe((storage) => {
    log.debug(
      `[chaindata] updating db blob with data (networks:${storage.networks.length}, tokens:${storage.tokens.length}, meta:${storage.miniMetadatas.length})`,
    )
    updateDbBlob(BLOB_ID, { id: BLOB_ID, ...storage })
  })
}
