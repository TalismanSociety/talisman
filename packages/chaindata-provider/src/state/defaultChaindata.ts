import { isEqual, isEqualWith, sortBy } from "lodash-es"
import { filter, firstValueFrom, Observable, shareReplay, Subject } from "rxjs"

import log from "../log"
import { ChaindataStorage } from "../provider/ChaindataProvider"
import { githubChaindata$ } from "./githubChaindata"
import initChaindata from "./initChaindata.json"
import { Chaindata, ChaindataFileSchema } from "./schema"

export const getDefaultChaindata$ = (storage$: Subject<ChaindataStorage>) => {
  const storageValidated$ = storage$.pipe(
    filter((data) => {
      const start = performance.now()
      const isValid = ChaindataFileSchema.safeParse(data).success
      log.debug(
        "[defaultChaindata$] Chaindata schema validation: %sms",
        (performance.now() - start).toFixed(2),
      )
      return isValid
    }),
  )

  return new Observable<Chaindata>((subscriber) => {
    const githubToStorageSubscription = githubChaindata$.subscribe({
      error: async () => {
        const storageData = await Promise.race([
          firstValueFrom(storageValidated$),
          new Promise<Chaindata>((resolve) =>
            // db promise might hang indefinitely if schema is invalid, fallback to empty data if this happens
            setTimeout(() => resolve({ networks: [], tokens: [], miniMetadatas: [] }), 2_000),
          ),
        ])

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

          storage$.next({
            networks: initChaindata.networks as Chaindata["networks"],
            tokens: initChaindata.tokens as Chaindata["tokens"],
            miniMetadatas: initChaindata.miniMetadatas as Chaindata["miniMetadatas"],
          })

          log.info("[defaultChaindata$] Initial chaindata file imported successfully")
        } catch (cause) {
          log.error("[defaultChaindata$] Failed to import initial chaindata file", { cause })
          return
        }
      },
      next: async (githubData) => {
        const now = performance.now()
        try {
          const dbData = await Promise.race([
            firstValueFrom(storageValidated$),
            new Promise<Chaindata>((resolve) =>
              // db promise might hand indefinitely if schema is invalid, fallback to init data if this happens
              setTimeout(() => resolve(initChaindata as Chaindata), 2_000),
            ),
          ])

          // TODO consider adding a hash in chaindata.json and compare just that ?
          const updateNetworks = shouldUpdateGithubEntity(githubData, dbData, "networks")
          const updateTokens = shouldUpdateGithubEntity(githubData, dbData, "tokens")
          const updateMiniMetadata = shouldUpdateGithubEntity(githubData, dbData, "miniMetadatas")

          if (!updateNetworks && !updateTokens && !updateMiniMetadata)
            return log.debug(
              `[defaultChaindata$] No db updates needed: ${performance.now() - now}ms`,
            )

          // update local db if chaindata is found different from Github
          log.debug(
            `[defaultChaindata$] Updating chaindata in DB (networks:${initChaindata.networks.length}, tokens:${initChaindata.tokens.length}, meta:${initChaindata.miniMetadatas.length})`,
          )
          storage$.next({
            networks: initChaindata.networks as Chaindata["networks"],
            tokens: initChaindata.tokens as Chaindata["tokens"],
            miniMetadatas: initChaindata.miniMetadatas as Chaindata["miniMetadatas"],
          })

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

const shouldUpdateGithubEntity = (cd1: Chaindata, cd2: Chaindata, key: keyof Chaindata) => {
  const sorted1 = sortBy(cd1[key], "id")
  const sorted2 = sortBy(cd2[key], "id")
  return !isEqualWith(sorted1, sorted2, isEqual)
}
