import { ChaindataProvider } from "@talismn/chaindata-provider"
import { atom } from "jotai"
import { atomEffect } from "jotai-effect"

import log from "../log"
import { cryptoWaitReadyAtom } from "./cryptoWaitReady"

export const chaindataProviderAtom = atom<ChaindataProvider>((get) => {
  // runs a timer to keep chaindata hydrated
  get(chaindataHydrateAtomEffect)

  return new ChaindataProvider({})
})

/** This atomEffect keeps chaindata hydrated (i.e. up to date with the GitHub repo) */
const chaindataHydrateAtomEffect = atomEffect((get, _set) => {
  const loopMs = 300_000 // 300_000ms = 300s = 5 minutes
  const retryTimeout = 5_000 // 5_000ms = 5 seconds

  let timeout: NodeJS.Timeout | null = null

  const hydrate = async () => {
    try {
      await get(cryptoWaitReadyAtom)
      timeout = setTimeout(hydrate, loopMs)
    } catch (error) {
      log.error(
        `Failed to hydrate chaindata, retrying in ${Math.round(retryTimeout / 1000)} seconds`,
        error,
      )
      timeout = setTimeout(hydrate, retryTimeout)
    }
  }

  // launch the loop
  hydrate()

  // return an unsub function to shut down the loop
  return () => timeout && clearTimeout(timeout)
})
