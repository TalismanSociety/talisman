import { fetchTokenRates, db as tokenRatesDb } from "@talismn/token-rates"
import { Deferred } from "@talismn/util"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomWithObservable } from "jotai/utils"
import { from, map } from "rxjs"

import log from "../log"
import { chaindataAtom } from "./chaindata"
import { coingeckoConfigAtom } from "./config"

/** A unique symbol which we use to tell our atoms that we want to trigger their side effects. */
const INIT = Symbol()

/** Represents a function which when called will clean up a subscription. */
type Unsubscribe = () => void

export const tokenRatesAtom = atom(async (get) => {
  const [tokenRates] = await Promise.all([get(tokenRatesDbAtom), get(tokenRatesFetcherAtom)])

  return tokenRates
})

const tokenRatesDbAtom = atomWithObservable(() =>
  from(
    // retrieve fetched tokenRates from the db
    liveQuery(() => tokenRatesDb.tokenRates.toArray())
  ).pipe(map((items) => Object.fromEntries(items.map((item) => [item.tokenId, item.rates]))))
)

// TODO: Make an `atomWithOnMountEffect` method which handles the `INIT` stuff internally
const tokenRatesFetcherAtom = atom<void, [typeof INIT], Unsubscribe>(
  () => {},

  // We use the `onMount` property to trigger this atom's setter on mount, so that we
  // can set up our tokenRates subscription.
  (get) => {
    const unsubscribed = Deferred<void>()
    const unsubscribe = () => unsubscribed.resolve()

    ;(async () => {
      const coingeckoConfig = get(coingeckoConfigAtom)

      const tokensById = (await get(chaindataAtom)).tokensById
      const tokenIds = Object.keys(tokensById)

      const loopMs = 300_000 // 300_000ms = 300s = 5 minutes
      const retryTimeout = 5_000 // 5_000ms = 5 seconds

      const hydrate = async () => {
        if (unsubscribed.isResolved()) return

        try {
          const tokenRates = await fetchTokenRates(tokensById, coingeckoConfig)
          const putTokenRates = Object.entries(tokenRates).map(([tokenId, rates]) => ({
            tokenId,
            rates,
          }))

          if (unsubscribed.isResolved()) return

          await tokenRatesDb.transaction("rw", tokenRatesDb.tokenRates, async () => {
            // override all tokenRates
            await tokenRatesDb.tokenRates.bulkPut(putTokenRates)

            // delete tokenRates for tokens which no longer exist
            const validTokenIds = new Set(tokenIds)
            const tokenRatesIds = await tokenRatesDb.tokenRates.toCollection().primaryKeys()
            const deleteIds = tokenRatesIds.filter((id) => !validTokenIds.has(id))
            if (deleteIds.length > 0) await tokenRatesDb.tokenRates.bulkDelete(deleteIds)
          })

          if (!unsubscribed.isResolved()) setTimeout(hydrate, loopMs)
        } catch (error) {
          log.error(
            `Failed to fetch tokenRates, retrying in ${Math.round(retryTimeout / 1000)} seconds`,
            error
          )
          setTimeout(async () => {
            hydrate()
          }, retryTimeout)
        }
      }

      // launch the loop
      hydrate()
    })()

    return () => {
      unsubscribe()
    }
  }
)
tokenRatesFetcherAtom.onMount = (dispatch) => dispatch(INIT)
