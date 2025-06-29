import { liveQuery } from "dexie"
import { isEqual, isEqualWith, sortBy } from "lodash"
import { combineLatest, filter, firstValueFrom, Observable, ReplaySubject, shareReplay } from "rxjs"

import { AnyMiniMetadata, Network, Token } from "../chaindata"
import log from "../log"
import { chaindataDb } from "./db"
import initChaindata from "./initChaindata.json"
import { fetchChaindata } from "./net"
import { Chaindata, ChaindataFileSchema } from "./schema"

const REFRESH_INTERVAL = 300_000 // 5 mins

const result = new ReplaySubject<Chaindata>(1)

let lastUpdatedAt = 0

const dbChaindata$ = combineLatest({
  networks: liveQuery(() => chaindataDb.networks.toArray()),
  tokens: liveQuery(() => chaindataDb.tokens.toArray()),
  miniMetadatas: liveQuery(() => chaindataDb.miniMetadatas.toArray()),
}).pipe(
  // tables are not coming all at once, even if provisionned by the same transaction
  // tokens are coming after networks, because they are larger
  // the schema will verify that there is a native token for each network
  // chaindata has the same check so we're sure this won't make the app hang
  filter((data) => {
    const start = performance.now()
    const isValid = ChaindataFileSchema.safeParse(data).success
    log.debug(
      "[defaultChaindata$] Chaindata schema validation: %sms",
      (performance.now() - start).toFixed(2),
    )
    return isValid
  }),
  shareReplay(1),
)

const ghChaindata$ = new Observable<Chaindata>((subscriber) => {
  const controller = new AbortController()

  const subscription = result.subscribe(subscriber)

  let timeout: ReturnType<typeof setTimeout> | null = null

  const refresh = async () => {
    try {
      const delay = Math.max(0, lastUpdatedAt + 60_000 - Date.now())
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      if (controller.signal.aborted) return

      log.debug("[defaultChaindata$] Refreshing chaindata from GitHub")
      const data = await fetchChaindata(controller.signal)
      lastUpdatedAt = Date.now()

      result.next(data)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return

      log.error("Failed to fetch chaindata", error)
      if (!subscriber.closed) result.error(error)
    } finally {
      if (!controller.signal.aborted) timeout = setTimeout(refresh, REFRESH_INTERVAL)
    }
  }

  refresh()

  return () => {
    if (timeout) clearTimeout(timeout)
    subscription.unsubscribe()
    controller.abort()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

const shouldUpdateGhEntity = (cd1: Chaindata, cd2: Chaindata, key: keyof Chaindata) => {
  const sorted1 = sortBy(cd1[key], "id")
  const sorted2 = sortBy(cd2[key], "id")
  return !isEqualWith(sorted1, sorted2, isEqual)
}

export const defaultChaindata$ = new Observable<Chaindata>((subscriber) => {
  const subUpdateFromGithub = ghChaindata$.subscribe({
    error: async () => {
      const dbData = await firstValueFrom(dbChaindata$)

      if (dbData.networks.length || dbData.tokens.length || dbData.miniMetadatas.length)
        return log.info(
          "[defaultChaindata$] DB is not empty, skipping initial data provision",
          dbData,
        )

      try {
        // if fetching from github fails, and if DB is empty, provision it with initial data
        log.info("[defaultChaindata$] Importing initial chaindata file", initChaindata)

        await chaindataDb.transaction(
          "rw",
          ["networks", "tokens", "miniMetadatas"],
          async (ctx) => {
            await ctx.tokens.bulkAdd(initChaindata.tokens as Token[])
            await ctx.miniMetadatas.bulkAdd(initChaindata.miniMetadatas as AnyMiniMetadata[])
            await ctx.networks.bulkAdd(initChaindata.networks as Network[])
          },
        )

        log.info("[defaultChaindata$] Initial chaindata file imported successfully")
      } catch (cause) {
        log.error("[defaultChaindata$] Failed to import initial chaindata file", { cause })
        return
      }
    },
    next: async (ghData) => {
      const now = performance.now()
      try {
        const dbData = await firstValueFrom(dbChaindata$)

        // TODO consider adding a hash in chaindata.json and compare just that ?
        const updateNetworks = shouldUpdateGhEntity(ghData, dbData, "networks")
        const updateTokens = shouldUpdateGhEntity(ghData, dbData, "tokens")
        const updateMiniMetadata = shouldUpdateGhEntity(ghData, dbData, "miniMetadatas")

        if (!updateNetworks && !updateTokens && !updateMiniMetadata)
          return log.debug(`[defaultChaindata$] No db updates needed: ${performance.now() - now}ms`)

        // update local db if chaindata is found different from GH
        await chaindataDb.transaction(
          "rw",
          ["networks", "tokens", "miniMetadatas"],
          async (ctx) => {
            if (updateMiniMetadata) {
              log.debug("[defaultChaindata$] Updating miniMetadatas in DB")
              await ctx.miniMetadatas.clear()
              await ctx.miniMetadatas.bulkAdd(ghData.miniMetadatas)
            }
            if (updateTokens) {
              log.debug("[defaultChaindata$] Updating tokens in DB")
              await ctx.tokens.clear()
              await ctx.tokens.bulkAdd(ghData.tokens)
            }
            if (updateNetworks) {
              log.debug("[defaultChaindata$] Updating networks in DB")
              await ctx.networks.clear()
              await ctx.networks.bulkAdd(ghData.networks)
            }
          },
        )

        log.info(`[defaultChaindata$] Db synchronized with GitHub :${performance.now() - now}ms`)
      } catch (cause) {
        log.error("[defaultChaindata$] Failed to sync chaindata", { cause })
      }
    },
  })

  const subOutput = dbChaindata$.subscribe(subscriber)

  return () => {
    subUpdateFromGithub.unsubscribe()
    subOutput.unsubscribe()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))
