import {
  Balance,
  BalanceJson,
  BalanceStatusLive,
  Balances,
  HydrateDb,
  db as balancesDb,
  balances as balancesFn,
  createSubscriptionId,
  deleteSubscriptionId,
  deriveStatuses,
  getValidSubscriptionIds,
} from "@talismn/balances"
import { firstThenDebounce } from "@talismn/util"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomEffect } from "jotai-effect"
import { atomWithObservable } from "jotai/utils"
import { from } from "rxjs"

import log from "../log"
import { allAddressesAtom } from "./allAddresses"
import { balanceModulesAtom } from "./balanceModules"
import {
  chaindataAtom,
  chainsAtom,
  evmNetworksAtom,
  miniMetadatasAtom,
  tokensAtom,
} from "./chaindata"
import { miniMetadataHydratedAtom } from "./chaindataProvider"
import { enabledChainsAtom } from "./config"
import { cryptoWaitReadyAtom } from "./cryptoWaitReady"
import { tokenRatesAtom } from "./tokenRates"

export const allBalancesAtom = atom(async (get) => {
  // set up our subscription to fetch balances from the various blockchains
  get(balancesSubscriptionAtomEffect)

  const [dbBalances, hydrateData] = await Promise.all([
    get(balancesDbAtom),
    get(balancesHydrateDataAtom),
  ])

  return new Balances(
    deriveStatuses(
      getValidSubscriptionIds(),
      dbBalances.filter((balance) => !!hydrateData?.tokens?.[balance.tokenId])
    ),

    // hydrate balance chains, evmNetworks, tokens and tokenRates
    hydrateData
  )
})

const balancesDbAtom = atomWithObservable<BalanceJson[] | Promise<BalanceJson[]>>(() =>
  from(
    // sync from db
    liveQuery(() => balancesDb.balances.toArray())
  )
    // subscription will do a lot of updates to the balances table
    // debounce to mitigate performance issues
    .pipe(firstThenDebounce(500))
)

const balancesHydrateDataAtom = atom(async (get): Promise<HydrateDb> => {
  const [{ chainsById, evmNetworksById, tokensById }, tokenRates] = await Promise.all([
    get(chaindataAtom),
    get(tokenRatesAtom),
  ])

  return { chains: chainsById, evmNetworks: evmNetworksById, tokens: tokensById, tokenRates }
})

const balancesSubscriptionAtomEffect = atomEffect((get) => {
  // lets us tear down the existing subscriptions when the atomEffect is restarted
  const abort = new AbortController()

  // we have to specify these synchronously, otherwise jotai won't know
  // that it needs to restart our subscriptions when they change
  const atomDependencies = Promise.all([
    get(cryptoWaitReadyAtom),

    get(balanceModulesAtom),
    get(miniMetadataHydratedAtom),

    get(allAddressesAtom),
    get(chainsAtom),
    get(evmNetworksAtom),
    get(tokensAtom),
    get(miniMetadatasAtom),

    get(enabledChainsAtom),
  ])

  const unsubsPromise = (async () => {
    const [
      _cryptoReady,

      balanceModules,
      miniMetadataHydrated,

      allAddresses,
      chains,
      _evmNetworks,
      tokens,
      _miniMetadatas,

      enabledChains,
    ] = await atomDependencies

    if (!miniMetadataHydrated) return
    if (abort.signal.aborted) return

    const updateBalances = async (balancesUpdates: Balances) => {
      if (abort.signal.aborted) return

      // seralize
      const updates = Object.entries(balancesUpdates.toJSON()).map(([id, balance]) => ({
        id,
        ...balance,
        status: BalanceStatusLive(subscriptionId),
      }))

      // update stored balances
      await balancesDb.balances.bulkPut(updates)
    }
    const deleteBalances = async (balancesFilter: (balance: Balance) => boolean) => {
      if (abort.signal.aborted) return

      return await balancesDb.transaction("rw", balancesDb.balances, async () => {
        const deleteBalances = new Balances(await balancesDb.balances.toArray()).each
          .filter(balancesFilter)
          .map((balance) => balance.id)

        await balancesDb.balances.bulkDelete(deleteBalances)
      })
    }

    const enabledChainIds = enabledChains?.map(
      (genesisHash) => chains.find((chain) => chain.genesisHash === genesisHash)?.id
    )

    const enabledTokens = enabledChains
      ? tokens.filter((token) => token.chain && enabledChainIds?.includes(token.chain.id))
      : tokens

    const enabledTokenIds = enabledTokens.map(({ id }) => id)

    if (enabledTokenIds.length < 1 || allAddresses.length < 1) return

    const addressesByToken = Object.fromEntries(
      enabledTokenIds.map((tokenId) => [tokenId, allAddresses])
    )

    // TODO: Delete invalid existing balances
    // TODO: Set up `initializing` balances

    const subscriptionId = createSubscriptionId()
    // TODO: Create subscriptions in a service worker, where we can detect page closes
    // and therefore reliably delete the subscriptionId when the user closes our dapp
    //
    // For more information, check out https://developer.chrome.com/blog/page-lifecycle-api/#faqs
    // and scroll down to:
    // - `What is the back/forward cache?`, and
    // - `If I can't run asynchronous APIs in the frozen or terminated states, how can I save data to IndexedDB?
    //
    // For now, we'll just last-ditch remove the subscriptionId (it works surprisingly well!) in the beforeunload event
    window.onbeforeunload = () => {
      deleteSubscriptionId()
    }

    return balanceModules.map((balanceModule) => {
      // filter out tokens to only include those which this module knows how to fetch balances for
      const moduleTokenIds = Object.values(enabledTokens ?? {})
        .filter(({ type }) => type === balanceModule.type)
        .map(({ id }) => id)
      const addressesByModuleToken = Object.fromEntries(
        Object.entries(addressesByToken).filter(([tokenId]) => moduleTokenIds.includes(tokenId))
      )

      const unsub = balancesFn(balanceModule, addressesByModuleToken, (error, balances) => {
        // log errors
        if (error) {
          if (
            error?.type === "STALE_RPC_ERROR" ||
            error?.type === "WEBSOCKET_ALLOCATION_EXHAUSTED_ERROR"
          )
            return balancesDb.balances
              .where({ source: balanceModule.type, chainId: error.chainId })
              .filter((balance) => {
                if (!Object.keys(addressesByModuleToken).includes(balance.tokenId)) return false
                if (!addressesByModuleToken[balance.tokenId].includes(balance.address)) return false
                return true
              })
              .modify({ status: "stale" })

          return log.error(`Failed to fetch ${balanceModule.type} balances`, error)
        }

        // ignore empty balance responses
        if (!balances) return
        // ignore balances from old subscriptions which are still in the process of unsubscribing
        if (abort.signal.aborted) return

        updateBalances(balances)
      })

      return () => unsub.then((unsubscribe) => unsubscribe())
    })
  })()

  // close the existing subscriptions when our effect unmounts
  // (wait 2 seconds before actually unsubscribing, to allow the websocket to be reused in that time)
  const unsubscribe = () => unsubsPromise.then((unsubs) => unsubs?.forEach((unsub) => unsub()))
  abort.signal.addEventListener("abort", () => setTimeout(unsubscribe, 2_000))
  abort.signal.addEventListener("abort", () => deleteSubscriptionId())

  return () => abort.abort("Unsubscribed")
})
