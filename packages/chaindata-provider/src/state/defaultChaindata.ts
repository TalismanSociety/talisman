import { isEqual } from "lodash-es"
import { firstValueFrom, map, Observable, shareReplay, Subject } from "rxjs"

import log from "../log"
import { ChaindataStorage } from "../provider/ChaindataProvider"
import { githubChaindata$ } from "./githubChaindata"
import initChaindata from "./initChaindata.json"
import { Chaindata, ChaindataFileSchema } from "./schema"

const EMPTY_DATA: Chaindata = { networks: [], tokens: [], miniMetadatas: [] }

export const getDefaultChaindata$ = (storage$: Subject<ChaindataStorage>) => {
  const storageValidated$ = storage$.pipe(
    map((data) => {
      const start = performance.now()
      const validation = ChaindataFileSchema.safeParse(data)
      log.debug(
        "[storageValidated$] Chaindata schema validation: %sms",
        (performance.now() - start).toFixed(2),
      )
      if (!validation.success)
        log.warn("[storageValidated$] Chaindata schema validation failed", {
          parsed: validation.data,
        })

      // schema is invalid, fallback to empty data
      return validation.success ? validation.data : EMPTY_DATA
    }),
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
            storageData,
          )

        try {
          // if fetching from github fails, and if DB is empty, provision it with initial data
          log.info("[defaultChaindata$] Importing initial chaindata file", initChaindata)
          storage$.next(initChaindata as Chaindata)
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

          const shouldUpdate = !isEqual(storageData, githubData)
          if (!shouldUpdate)
            return log.debug(
              `[defaultChaindata$] No db updates needed: ${performance.now() - now}ms`,
            )

          // update local chaindata if github chaindata is different
          log.debug(
            `[defaultChaindata$] Updating chaindata in DB (networks:${githubData.networks.length}, tokens:${githubData.tokens.length}, meta:${githubData.miniMetadatas.length})`,
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
