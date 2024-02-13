import {
  hydrateChaindataAndMiniMetadata,
  updateCustomMiniMetadata,
  updateEvmTokens,
} from "@talismn/balances"
import { ChaindataProvider } from "@talismn/chaindata-provider"
import { atom } from "jotai"
import { atomWithObservable } from "jotai/utils"

import log from "../log"
import { enableTestnetsAtom, onfinalityApiKeyAtom } from "./config"
import { cryptoWaitReadyAtom } from "./cryptoWaitReady"
import { evmTokenFetcherAtom, miniMetadataUpdaterAtom } from "./miniMetadatas"

/** A unique symbol which we use to tell our atoms that we want to trigger their side effects. */
const INIT = Symbol()

/** Represents a function which when called will clean up a subscription. */
type Unsubscribe = () => void

// TODO: Make an `atomWithOnMountEffect` method which handles the `INIT` stuff internally
export const chaindataProviderAtom = atom<ChaindataProvider, [typeof INIT], Unsubscribe>(
  (get) => new ChaindataProvider({ onfinalityApiKey: get(onfinalityApiKeyAtom) }),

  // We use the `onMount` property to trigger this atom's setter on mount, so that we
  // can set up our chaindata subscriptions.
  (get) => {
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
  }
)
chaindataProviderAtom.onMount = (dispatch) => dispatch(INIT)

export const chaindataAtom = atom(async (get) => {
  const chaindata = await get(allChaindataAtom)

  const enableTestnets = get(enableTestnetsAtom)

  const filterTestnets = <T extends { isTestnet: boolean }>(items: T[]) =>
    enableTestnets ? items : items.filter(({ isTestnet }) => !isTestnet)
  const filterMapTestnets = <T extends { isTestnet: boolean }>(items: Record<string, T>) =>
    enableTestnets
      ? items
      : Object.fromEntries(Object.entries(items).filter(([, { isTestnet }]) => !isTestnet))

  const chains = filterTestnets(chaindata.chains)
  const chainsById = filterMapTestnets(chaindata.chainsById)
  const chainsByGenesisHash = filterMapTestnets(chaindata.chainsByGenesisHash)
  const evmNetworks = filterTestnets(chaindata.evmNetworks)
  const evmNetworksById = filterMapTestnets(chaindata.evmNetworksById)
  const tokens = filterTestnets(chaindata.tokens)
  const tokensById = filterMapTestnets(chaindata.tokensById)

  const enabledTokens = tokens.filter(
    (token) => token.isDefault || ("isCustom" in token && token.isCustom)
  )
  const enabledTokensById = Object.fromEntries(
    Object.entries(tokensById).filter(
      ([, token]) => token.isDefault || ("isCustom" in token && token.isCustom)
    )
  )

  return {
    chains,
    chainsById,
    chainsByGenesisHash,
    evmNetworks,
    evmNetworksById,
    tokens: enabledTokens,
    tokensById: enabledTokensById,
  }
})

// TODO: Debounce
const allChaindataAtom = atom(async (get) => {
  const [
    chains,
    chainsById,
    chainsByGenesisHash,
    evmNetworks,
    evmNetworksById,
    tokens,
    tokensById,
  ] = await Promise.all([
    get(chainsAtom),
    get(chainsByIdAtom),
    get(chainsByGenesisHashAtom),
    get(evmNetworksAtom),
    get(evmNetworksByIdAtom),
    get(tokensAtom),
    get(tokensByIdAtom),
  ])

  return {
    chains,
    chainsById,
    chainsByGenesisHash,
    evmNetworks,
    evmNetworksById,
    tokens,
    tokensById,
  }
})

const chainsAtom = atomWithObservable((get) => get(chaindataProviderAtom).chainsObservable)
const chainsByIdAtom = atomWithObservable((get) => get(chaindataProviderAtom).chainsByIdObservable)
const chainsByGenesisHashAtom = atomWithObservable(
  (get) => get(chaindataProviderAtom).chainsByGenesisHashObservable
)
const evmNetworksAtom = atomWithObservable(
  (get) => get(chaindataProviderAtom).evmNetworksObservable
)
const evmNetworksByIdAtom = atomWithObservable(
  (get) => get(chaindataProviderAtom).evmNetworksByIdObservable
)
const tokensAtom = atomWithObservable((get) => get(chaindataProviderAtom).tokensObservable)
const tokensByIdAtom = atomWithObservable((get) => get(chaindataProviderAtom).tokensByIdObservable)
