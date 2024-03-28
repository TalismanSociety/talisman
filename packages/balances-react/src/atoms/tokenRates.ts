import { DbTokenRates, fetchTokenRates, db as tokenRatesDb } from "@talismn/token-rates"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomEffect } from "jotai-effect"
import { atomWithObservable } from "jotai/utils"
import { map } from "rxjs"

import log from "../log"
import { dexieToRxjs } from "../util/dexieToRxjs"
import { tokensByIdAtom } from "./chaindata"
import { coingeckoConfigAtom } from "./config"

export const tokenRatesAtom = atom(async (get) => {
  // runs a timer to keep tokenRates up to date
  get(tokenRatesFetcherAtomEffect)

  return await get(tokenRatesDbAtom)
})

const tokenRatesDbAtom = atomWithObservable(() => {
  const dbRatesToMap = (dbRates: DbTokenRates[]) =>
    Object.fromEntries(dbRates.map(({ tokenId, rates }) => [tokenId, rates]))

  // retrieve fetched tokenRates from the db
  return dexieToRxjs(liveQuery(() => tokenRatesDb.tokenRates.toArray())).pipe(map(dbRatesToMap))
})

const tokenRatesFetcherAtomEffect = atomEffect((get) => {
  // lets us tear down the existing timer when the effect is restarted
  const abort = new AbortController()

  // we have to get these synchronously so that jotai knows to restart our timer when they change
  const coingeckoConfig = get(coingeckoConfigAtom)
  const tokensByIdPromise = get(tokensByIdAtom)

  ;(async () => {
    const tokensById = await tokensByIdPromise
    const tokenIds = Object.keys(tokensById)

    const loopMs = 300_000 // 300_000ms = 300s = 5 minutes
    const retryTimeout = 5_000 // 5_000ms = 5 seconds

    const hydrate = async () => {
      try {
        if (abort.signal.aborted) return // don't fetch if aborted
        const tokenRates = await fetchTokenRates(tokensById, coingeckoConfig)
        const putTokenRates = Object.entries(tokenRates).map(([tokenId, rates]) => ({
          tokenId,
          rates,
        }))

        if (abort.signal.aborted) return // don't insert into db if aborted
        await tokenRatesDb.transaction("rw", tokenRatesDb.tokenRates, async () => {
          // override all tokenRates
          await tokenRatesDb.tokenRates.bulkPut(putTokenRates)

          // delete tokenRates for tokens which no longer exist
          const validTokenIds = new Set(tokenIds)
          const tokenRatesIds = await tokenRatesDb.tokenRates.toCollection().primaryKeys()
          const deleteIds = tokenRatesIds.filter((id) => !validTokenIds.has(id))
          if (deleteIds.length > 0) await tokenRatesDb.tokenRates.bulkDelete(deleteIds)
        })

        if (abort.signal.aborted) return // don't schedule next loop if aborted
        setTimeout(hydrate, loopMs)
      } catch (error) {
        const retrying = !abort.signal.aborted
        const messageParts = [
          "Failed to fetch tokenRates",
          retrying && `retrying in ${Math.round(retryTimeout / 1000)} seconds`,
          !retrying && `giving up (timer no longer needed)`,
        ].filter(Boolean)
        log.error(messageParts.join(", "), error)

        if (abort.signal.aborted) return // don't schedule retry if aborted
        setTimeout(hydrate, retryTimeout)
      }
    }

    // launch the loop
    hydrate()
  })()

  return () => abort.abort("Unsubscribed")
})
