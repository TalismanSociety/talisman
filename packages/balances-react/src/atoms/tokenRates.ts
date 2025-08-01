import {
  ALL_CURRENCY_IDS,
  fetchTokenRates,
  TokenRatesStorage,
  tryToDeleteOldTokenRatesDb,
} from "@talismn/token-rates"
import { isAbortError, isTruthy } from "@talismn/util"
import { atom } from "jotai"
import { atomEffect } from "jotai-effect"
import { atomWithObservable } from "jotai/utils"
import { keyBy } from "lodash-es"
import { ReplaySubject } from "rxjs"

import log from "../log"
import { tokensAtom } from "./chaindata"
import { coinsApiConfigAtom } from "./config"

export const tokenRatesAtom = atom(async (get) => {
  // runs a timer to keep tokenRates up to date
  get(tokenRatesFetcherAtomEffect)

  return (await get(tokenRatesDbAtom)).tokenRates
})

// TODO: Persist to storage
const tokenRates$ = new ReplaySubject<TokenRatesStorage>(1)

const tokenRatesDbAtom = atomWithObservable(() => {
  tryToDeleteOldTokenRatesDb()
  return tokenRates$.asObservable()
})

const tokenRatesFetcherAtomEffect = atomEffect((get) => {
  // lets us tear down the existing timer when the effect is restarted
  const abort = new AbortController()

  // we have to get these synchronously so that jotai knows to restart our timer when they change
  const coinsApiConfig = get(coinsApiConfigAtom)
  const tokensPromise = get(tokensAtom)

  ;(async () => {
    const tokensById = keyBy(await tokensPromise, "id")

    const loopMs = 300_000 // 300_000ms = 300s = 5 minutes
    const retryTimeout = 5_000 // 5_000ms = 5 seconds

    const hydrate = async () => {
      try {
        if (abort.signal.aborted) return // don't fetch if aborted
        const tokenRates = await fetchTokenRates(tokensById, ALL_CURRENCY_IDS, coinsApiConfig)
        const putTokenRates: TokenRatesStorage = { tokenRates }

        if (abort.signal.aborted) return // don't insert into db if aborted
        tokenRates$.next(putTokenRates)

        if (abort.signal.aborted) return // don't schedule next loop if aborted
        setTimeout(hydrate, loopMs)
      } catch (error) {
        const retrying = !abort.signal.aborted
        const messageParts = [
          "Failed to fetch tokenRates",
          retrying && `retrying in ${Math.round(retryTimeout / 1000)} seconds`,
          !retrying && `giving up (timer no longer needed)`,
        ].filter(isTruthy)
        log.error(messageParts.join(", "), error)

        if (isAbortError(error)) return // don't schedule retry if aborted
        setTimeout(hydrate, retryTimeout)
      }
    }

    // launch the loop
    hydrate()
  })()

  return () => abort.abort("Unsubscribed")
})
