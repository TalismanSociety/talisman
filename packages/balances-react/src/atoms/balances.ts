import {
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
import { Deferred, firstThenDebounce } from "@talismn/util"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomWithObservable } from "jotai/utils"
import { from } from "rxjs"

import log from "../log"
import { allAddressesAtom } from "./allAddresses"
import { balanceModulesAtom } from "./balanceModules"
import { chainConnectorsAtom } from "./chainConnectors"
import { chaindataAtom, chaindataProviderAtom } from "./chaindata"
import { enabledChainsAtom } from "./config"
import { cryptoWaitReadyAtom } from "./cryptoWaitReady"
import { miniMetadatasAtom } from "./miniMetadatas"
import { tokenRatesAtom } from "./tokenRates"

/** A unique symbol which we use to tell our atoms that we want to trigger their side effects. */
const INIT = Symbol()

/** Represents a function which when called will clean up a subscription. */
type Unsubscribe = () => void

const balancesQueryAtom = atom(async (get) => {
  const allBalances = get(allBalancesAtom)

  // TODO: Filter by addressesByToken query
})

export const allBalancesAtom = atom(async (get) => {
  const [_balancesSub, dbBalances, hydrateData] = await Promise.all([
    get(balancesSubscriptionAtom),
    get(balancesDbAtom),
    get(balancesHydrateDataAtom),
  ])

  return new Balances(
    deriveStatuses(
      getValidSubscriptionIds(),
      dbBalances
      //   .filter((balance) => {
      //     // check that this balance is included in our queried balance modules
      //     if (!balanceModules.map(({ type }) => type).includes(balance.source)) return false

      //     // // check that our query includes some tokens and addresses
      //     // if (!addressesByToken) return false

      //     // // check that this balance is included in our queried tokens
      //     // if (!Object.keys(addressesByToken).includes(balance.tokenId)) return false

      //     // // check that this balance is included in our queried addresses for this token
      //     // if (!addressesByToken[balance.tokenId].includes(balance.address)) return false

      //     // keep this balance
      //     return true
      //   })
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

// TODO: Make an `atomWithOnMountEffect` method which handles the `INIT` stuff internally
const balancesSubscriptionAtom = atom<void, [typeof INIT], Unsubscribe>(
  () => {},
  (get) => {
    const unsubscribed = Deferred<void>()
    const unsubscribe = () => unsubscribed.resolve()

    ;(async () => {
      const [
        _cryptoReady,
        balanceModules,
        chaindataProvider,
        chainConnectors,

        allAddresses,
        { chains, evmNetworks, tokens },
        miniMetadatas,

        enabledChains,
      ] = await Promise.all([
        get(cryptoWaitReadyAtom),

        get(balanceModulesAtom),
        get(chaindataProviderAtom),
        get(chainConnectorsAtom),

        get(allAddressesAtom),
        get(chaindataAtom),
        get(miniMetadatasAtom),

        get(enabledChainsAtom),
      ])

      console.log(
        "_cryptoReady",
        _cryptoReady,
        "balanceModules",
        balanceModules,
        "chaindataProvider",
        chaindataProvider,
        "chainConnectors",
        chainConnectors,
        "allAddresses",
        allAddresses,
        "enabledChains",
        enabledChains
      )

      const enabledChainIds = enabledChains?.map(
        (genesisHash) => chains.find((chain) => chain.genesisHash === genesisHash)?.id
      )

      const enabledTokens = enabledChains
        ? tokens.filter((token) => token.chain && enabledChainIds?.includes(token.chain.id))
        : tokens

      // TODO: Delete existing balances
      // TODO: Use generation id to prevent old subscriptions from updating values in db

      const tokenIds = enabledTokens.map(({ id }) => id)
      const addressesByToken = Object.fromEntries(
        tokenIds.map((tokenId) => [tokenId, allAddresses])
      )

      console.log("addressesByToken", addressesByToken)

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

      const updateDb = async (balancesUpdates: Balances) => {
        // seralize
        const updates = Object.entries(balancesUpdates.toJSON()).map(([id, balance]) => ({
          id,
          ...balance,
          status: BalanceStatusLive(subscriptionId),
        }))

        // update stored balances
        await balancesDb.balances.bulkPut(updates)
      }

      const unsubs = balanceModules.map(async (balanceModule) => {
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
                  if (!addressesByModuleToken[balance.tokenId].includes(balance.address))
                    return false
                  return true
                })
                .modify({ status: "stale" })

            return log.error(`Failed to fetch ${balanceModule.type} balances`, error)
          }
          // ignore empty balance responses
          if (!balances) return
          // ignore balances from old subscriptions which are still in the process of unsubscribing
          if (unsubscribed.isResolved()) return

          updateDb(balances)
        })

        return () => {
          // wait 2 seconds before actually unsubscribing, allowing for websocket to be reused
          unsub.then((unsubscribe) => {
            setTimeout(unsubscribe, 2_000)
          })
          deleteSubscriptionId()
        }
      })

      unsubscribed.promise.then(() => {
        unsubs.forEach((unsub) => unsub.then((unsubscribe) => unsubscribe()))
      })
    })()

    return () => {
      unsubscribe()
    }
  }
)
balancesSubscriptionAtom.onMount = (dispatch) => dispatch(INIT)
