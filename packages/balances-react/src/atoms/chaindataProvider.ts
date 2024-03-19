import {
  EvmTokenFetcher,
  MiniMetadataUpdater,
  hydrateChaindataAndMiniMetadata,
  updateCustomMiniMetadata,
  updateEvmTokens,
} from "@talismn/balances"
import { ChaindataProvider } from "@talismn/chaindata-provider"
import { atom } from "jotai"
import { atomEffect } from "jotai-effect"

import log from "../log"
import { balanceModulesAtom } from "./balanceModules"
import { chainConnectorsAtom } from "./chainConnectors"
import { onfinalityApiKeyAtom } from "./config"
import { cryptoWaitReadyAtom } from "./cryptoWaitReady"

export const chaindataProviderAtom = atom<ChaindataProvider>((get) => {
  // runs a timer to keep chaindata hydrated
  get(chaindataHydrateAtomEffect)

  return new ChaindataProvider({ onfinalityApiKey: get(onfinalityApiKeyAtom) })
})

export const miniMetadataHydratedAtom = atom(false)

/** This atomEffect keeps chaindata hydrated (i.e. up to date with the GitHub repo) */
const chaindataHydrateAtomEffect = atomEffect((get, set) => {
  const chaindataProvider = get(chaindataProviderAtom)
  const miniMetadataUpdater = get(miniMetadataUpdaterAtom)
  const evmTokenFetcher = get(evmTokenFetcherAtom)

  const loopMs = 300_000 // 300_000ms = 300s = 5 minutes
  const retryTimeout = 5_000 // 5_000ms = 5 seconds

  let timeout: NodeJS.Timeout | null = null

  const hydrate = async () => {
    try {
      await get(cryptoWaitReadyAtom)

      await hydrateChaindataAndMiniMetadata(chaindataProvider, miniMetadataUpdater)
      await updateCustomMiniMetadata(chaindataProvider, miniMetadataUpdater)
      await updateEvmTokens(chaindataProvider, evmTokenFetcher)

      set(miniMetadataHydratedAtom, true)

      timeout = setTimeout(hydrate, loopMs)
    } catch (error) {
      log.error(
        `Failed to hydrate chaindata, retrying in ${Math.round(retryTimeout / 1000)} seconds`,
        error
      )
      timeout = setTimeout(hydrate, retryTimeout)
    }
  }

  // launch the loop
  hydrate()

  // return an unsub function to shut down the loop
  return () => timeout && clearTimeout(timeout)
})

/** MiniMetadataUpdater is a class used for hydrating chaindata */
const miniMetadataUpdaterAtom = atom<MiniMetadataUpdater>((get) => {
  const chainConnectors = get(chainConnectorsAtom)
  const chaindataProvider = get(chaindataProviderAtom)
  const balanceModules = get(balanceModulesAtom)

  return new MiniMetadataUpdater(chainConnectors, chaindataProvider, balanceModules)
})

/** EvmTokenFetcher is a class used for hydrating chaindata */
const evmTokenFetcherAtom = atom<EvmTokenFetcher>((get) => {
  const chaindataProvider = get(chaindataProviderAtom)
  const balanceModules = get(balanceModulesAtom)

  return new EvmTokenFetcher(chaindataProvider, balanceModules)
})
