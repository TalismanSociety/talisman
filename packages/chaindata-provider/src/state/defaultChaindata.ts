import { isNotNil, switchMapChunked } from "@talismn/util"
import {
  filter,
  firstValueFrom,
  Observable,
  retry,
  type Subject,
  shareReplay,
  tap,
  timer,
} from "rxjs"

import { DEFAULT_CHAINDATA_URL } from "../constants"
import log from "../log"
import type { ChaindataStorage } from "../provider/ChaindataProvider"
import { chaindataEqualWithYield, parseChaindataFileChunked } from "./chunkedValidation"
import initChaindata from "./initChaindata.json"
import { getRemoteChaindata$ } from "./remoteChaindata"
import type { Chaindata, ChaindataFile } from "./schema"
import { isChaindataValidated, markChaindataValidated } from "./validatedCache"

const EMPTY_DATA: Chaindata = { networks: [], tokens: [], miniMetadatas: [] }

const RETRY_BASE_DELAY = 30_000
const RETRY_MAX_DELAY = 300_000

const getRetryDelay = (retryCount: number) =>
  Math.min(RETRY_BASE_DELAY * 2 ** (retryCount - 1), RETRY_MAX_DELAY)

const validateProvidedChaindata = (providedChaindata$: Observable<ChaindataFile>) =>
  providedChaindata$.pipe(
    switchMapChunked(async (data, { slicer }) => {
      if (isChaindataValidated(data)) return data

      const validation = await parseChaindataFileChunked(data, { slicer })
      if (!validation.success) {
        log.error("[defaultChaindata$] Invalid chaindata provided", { error: validation.error })
        return null
      }
      return markChaindataValidated(validation.data)
    }),
    filter(isNotNil),
    tap({ error: (cause) => log.error("[defaultChaindata$] Provided chaindata failed", { cause }) })
  )

export const getDefaultChaindata$ = (
  storage$: Subject<ChaindataStorage>,
  providedChaindata$?: Observable<ChaindataFile>
) => {
  // ref-memo of the last validated input: storage$ is a ReplaySubject which replays its
  // last value whenever the shareReplay below recovers from refCount 0 — without this,
  // every re-subscription would re-validate the whole dataset
  let lastInput: ChaindataStorage | null = null
  let lastOutput: Chaindata = EMPTY_DATA

  const storageValidated$ = storage$.pipe(
    switchMapChunked(async (data, { slicer }) => {
      // objects marked by fetchChaindata / validateProvidedChaindata / the initChaindata
      // provisioning below have already been validated: pass them through without re-validating
      if (isChaindataValidated(data)) return data
      if (data === lastInput) return lastOutput

      const start = performance.now()
      const validation = await parseChaindataFileChunked(data, { slicer })
      log.debug(
        "[storageValidated$] Chaindata schema validation: %sms",
        (performance.now() - start).toFixed(2)
      )
      if (!validation.success)
        log.warn("[storageValidated$] Chaindata schema validation failed", {
          error: validation.error,
        })

      lastInput = data
      // schema is invalid, fallback to empty data
      lastOutput = validation.success ? markChaindataValidated(validation.data) : EMPTY_DATA
      return lastOutput
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  return new Observable<Chaindata>((subscriber) => {
    const provisionInitialChaindata = async () => {
      const storageData = await firstValueFrom(storageValidated$)

      if (
        storageData.networks.length ||
        storageData.tokens.length ||
        storageData.miniMetadatas.length
      )
        return log.info(
          "[defaultChaindata$] DB is not empty, skipping initial data provision",
          storageData
        )

      try {
        // if fetching the default chaindata fails, and if DB is empty, provision it with initial data
        log.info("[defaultChaindata$] Importing initial chaindata file")
        const validation = await parseChaindataFileChunked(initChaindata)
        if (!validation.success) {
          log.error("[defaultChaindata$] initChaindata failed schema validation", {
            error: validation.error,
          })
          return
        }
        storage$.next(markChaindataValidated(validation.data))
        log.info("[defaultChaindata$] Initial chaindata file imported successfully")
      } catch (cause) {
        log.error("[defaultChaindata$] Failed to import initial chaindata file", { cause })
        return
      }
    }

    const syncToStorage = async (sourceData: Chaindata) => {
      const now = performance.now()
      try {
        const storageData = await firstValueFrom(storageValidated$)

        const shouldUpdate = !(await chaindataEqualWithYield(storageData, sourceData))
        if (!shouldUpdate)
          return log.debug(`[defaultChaindata$] No db updates needed: ${performance.now() - now}ms`)

        // update local chaindata if source chaindata is different
        log.debug(
          `[defaultChaindata$] Updating chaindata in DB (networks:${sourceData.networks.length}, tokens:${sourceData.tokens.length}, meta:${sourceData.miniMetadatas.length})`
        )
        storage$.next(sourceData)

        log.info(
          `[defaultChaindata$] Db synchronized with chaindata source :${performance.now() - now}ms`
        )
      } catch (cause) {
        log.error("[defaultChaindata$] Failed to sync chaindata", { cause })
      }
    }

    // initChaindata is a snapshot of the default chaindata, not of a provided one
    const source$ = providedChaindata$
      ? validateProvidedChaindata(providedChaindata$)
      : getRemoteChaindata$(DEFAULT_CHAINDATA_URL).pipe(tap({ error: provisionInitialChaindata }))

    const sourceToStorageSubscription = source$
      .pipe(
        retry({ delay: (_, retryCount) => timer(getRetryDelay(retryCount)), resetOnSuccess: true })
      )
      .subscribe(syncToStorage)
    subscriber.add(sourceToStorageSubscription)

    const outputFromStorageSubscription = storageValidated$.subscribe(subscriber)
    subscriber.add(outputFromStorageSubscription)
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }))
}
