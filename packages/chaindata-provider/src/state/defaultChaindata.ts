import { switchMapChunked } from "@talismn/util"
import { firstValueFrom, Observable, type Subject, shareReplay } from "rxjs"

import log from "../log"
import type { ChaindataStorage } from "../provider/ChaindataProvider"
import { chaindataEqualWithYield, parseChaindataFileChunked } from "./chunkedValidation"
import { githubChaindata$ } from "./githubChaindata"
import initChaindata from "./initChaindata.json"
import type { Chaindata } from "./schema"
import { isChaindataValidated, markChaindataValidated } from "./validatedCache"

const EMPTY_DATA: Chaindata = { networks: [], tokens: [], miniMetadatas: [] }

export const getDefaultChaindata$ = (storage$: Subject<ChaindataStorage>) => {
  // ref-memo of the last validated input: storage$ is a ReplaySubject which replays its
  // last value whenever the shareReplay below recovers from refCount 0 — without this,
  // every re-subscription would re-validate the whole dataset
  let lastInput: ChaindataStorage | null = null
  let lastOutput: Chaindata = EMPTY_DATA

  const storageValidated$ = storage$.pipe(
    switchMapChunked(async (data, { slicer }) => {
      // objects marked by fetchChaindata / the initChaindata provisioning below have
      // already been validated: pass them through without re-validating
      if (isChaindataValidated(data)) return data as Chaindata
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
    const githubToStorageSubscription = githubChaindata$.subscribe({
      error: async () => {
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
          // if fetching from github fails, and if DB is empty, provision it with initial data
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
      },
      next: async (githubData) => {
        const now = performance.now()
        try {
          const storageData = await firstValueFrom(storageValidated$)

          const shouldUpdate = !(await chaindataEqualWithYield(storageData, githubData))
          if (!shouldUpdate)
            return log.debug(
              `[defaultChaindata$] No db updates needed: ${performance.now() - now}ms`
            )

          // update local chaindata if github chaindata is different
          log.debug(
            `[defaultChaindata$] Updating chaindata in DB (networks:${githubData.networks.length}, tokens:${githubData.tokens.length}, meta:${githubData.miniMetadatas.length})`
          )
          storage$.next(githubData)

          log.info(`[defaultChaindata$] Db synchronized with GitHub :${performance.now() - now}ms`)
        } catch (cause) {
          log.error("[defaultChaindata$] Failed to sync chaindata", { cause })
        }
      },
    })
    subscriber.add(githubToStorageSubscription)

    const outputFromStorageSubscription = storageValidated$.subscribe(subscriber)
    subscriber.add(outputFromStorageSubscription)
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }))
}
