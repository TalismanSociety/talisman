import { ChaindataStorage } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, Observable } from "rxjs"

import { getBlobStore } from "../../db"

const blobStore = getBlobStore<ChaindataStorage>("chaindata")

export const loadChaindataPersistedStorage = async (): Promise<ChaindataStorage | undefined> => {
  try {
    return (await blobStore.get()) ?? undefined
  } catch (error) {
    log.error("[chaindata] failed to load chaindata store on startup", error)
    return undefined
  }
}

export const streamChaindataStorageChangesToDisk = (storage$: Observable<ChaindataStorage>) => {
  // persist store to db on changes
  storage$.pipe(debounceTime(2_000), distinctUntilChanged(isEqual)).subscribe((storage) => {
    log.debug(
      `[chaindata] updating db blob with data (networks:${storage.networks.length}, tokens:${storage.tokens.length}, meta:${storage.miniMetadatas.length})`,
    )
    blobStore.set(storage)
  })
}
