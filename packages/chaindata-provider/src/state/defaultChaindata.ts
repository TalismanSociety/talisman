import { isEqual } from "lodash-es"
import { firstValueFrom, map, Observable, type Subject, shareReplay } from "rxjs"

import log from "../log"
import type { ChaindataStorage } from "../provider/ChaindataProvider"
import { getGithubChaindata$ } from "./githubChaindata"
import initChaindata from "./initChaindata.json"
import { type Chaindata, ChaindataFileSchema } from "./schema"

const EMPTY_DATA: Chaindata = { networks: [], tokens: [], miniMetadatas: [] }

export const getDefaultChaindata$ = (
  storage$: Subject<ChaindataStorage>,
  chaindataUrl?: string
) => {
  const storageValidated$ = storage$.pipe(
    map((data) => {
      const start = performance.now()
      const validation = ChaindataFileSchema.safeParse(data)
      log.debug(
        "[storageValidated$] Chaindata schema validation: %sms",
        (performance.now() - start).toFixed(2)
      )
      if (!validation.success)
        log.warn("[storageValidated$] Chaindata schema validation failed", {
          parsed: validation.data,
        })

      // schema is invalid, fallback to empty data
      return validation.success ? validation.data : EMPTY_DATA
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  )

  return new Observable<Chaindata>((subscriber) => {
    const githubToStorageSubscription = getGithubChaindata$(chaindataUrl).subscribe({
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
          const validation = ChaindataFileSchema.safeParse(initChaindata)
          if (!validation.success) {
            log.error("[defaultChaindata$] initChaindata failed schema validation", {
              error: validation.error,
            })
            return
          }
          storage$.next(validation.data)
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
