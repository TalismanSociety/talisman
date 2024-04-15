import {
  AddressesByToken,
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
import { Token } from "@talismn/chaindata-provider"
import { firstThenDebounce, isEthereumAddress } from "@talismn/util"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomEffect } from "jotai-effect"
import { atomWithObservable } from "jotai/utils"

import log from "../log"
import { dexieToRxjs } from "../util/dexieToRxjs"
import { allAddressesAtom } from "./allAddresses"
import { balanceModulesAtom } from "./balanceModules"
import {
  chaindataAtom,
  chainsAtom,
  chainsByIdAtom,
  evmNetworksAtom,
  evmNetworksByIdAtom,
  miniMetadatasAtom,
  tokensAtom,
  tokensByIdAtom,
} from "./chaindata"
import { miniMetadataHydratedAtom } from "./chaindataProvider"
import { enabledChainsAtom, enabledTokensAtom } from "./config"
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
  dexieToRxjs(
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
    get(chainsByIdAtom),
    get(evmNetworksAtom),
    get(evmNetworksByIdAtom),
    get(tokensAtom),
    get(tokensByIdAtom),
    get(miniMetadatasAtom),

    get(enabledChainsAtom),
    get(enabledTokensAtom),
  ])

  const unsubsPromise = (async () => {
    const [
      _cryptoReady,

      balanceModules,
      miniMetadataHydrated,

      allAddresses,
      chains,
      chainsById,
      evmNetworks,
      evmNetworksById,
      tokens,
      tokensById,
      _miniMetadatas,

      enabledChainsConfig,
      enabledTokensConfig,
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

    const enabledChainIds = enabledChainsConfig?.map(
      (genesisHash) => chains.find((chain) => chain.genesisHash === genesisHash)?.id
    )
    const enabledChainsFilter = enabledChainIds
      ? (token: Token) => token.chain && enabledChainIds?.includes(token.chain.id)
      : () => true
    const enabledTokensFilter = enabledTokensConfig
      ? (token: Token) => enabledTokensConfig.includes(token.id)
      : () => true

    const enabledTokenIds = tokens
      .filter(enabledChainsFilter)
      .filter(enabledTokensFilter)
      .map(({ id }) => id)

    if (enabledTokenIds.length < 1 || allAddresses.length < 1) return

    const addressesByTokenByModule: Record<string, AddressesByToken<Token>> = {}
    enabledTokenIds
      .flatMap((tokenId) => tokensById[tokenId])
      .forEach((token) => {
        // filter out tokens on chains/evmNetworks which have no rpcs
        const hasRpcs =
          (token.chain?.id && (chainsById[token.chain.id]?.rpcs?.length ?? 0) > 0) ||
          (token.evmNetwork?.id && (evmNetworksById[token.evmNetwork.id]?.rpcs?.length ?? 0) > 0)
        if (!hasRpcs) return

        if (!addressesByTokenByModule[token.type]) addressesByTokenByModule[token.type] = {}
        addressesByTokenByModule[token.type][token.id] = allAddresses.filter((address) => {
          // for each address, fetch balances only from compatible chains
          return isEthereumAddress(address)
            ? token.evmNetwork?.id || chainsById[token.chain?.id ?? ""]?.account === "secp256k1"
            : token.chain?.id && chainsById[token.chain?.id ?? ""]?.account !== "secp256k1"
        })
      })

    // Delete invalid cached balances
    const chainIds = new Set(chains.map((chain) => chain.id))
    const evmNetworkIds = new Set(evmNetworks.map((evmNetwork) => evmNetwork.id))
    await deleteBalances((balance) => {
      // delete cached balances for accounts which don't exist anymore
      if (!balance.address || !allAddresses.includes(balance.address)) return true

      // delete cached balances when chain/evmNetwork doesn't exist
      if (balance.chainId === undefined && balance.evmNetworkId === undefined) return true
      if (balance.chainId !== undefined && !chainIds.has(balance.chainId)) return true
      if (balance.evmNetworkId !== undefined && !evmNetworkIds.has(balance.evmNetworkId))
        return true

      // delete cached balance when token doesn't exist / is disabled
      if (!enabledTokenIds.includes(balance.tokenId)) return true

      // delete cached balance when module doesn't exist
      if (!balanceModules.find((module) => module.type === balance.source)) return true

      // delete cached balance for accounts on incompatible chains
      // (substrate accounts shouldn't have evm balances)
      // (evm accounts shouldn't have substrate balances (unless the chain uses secp256k1 accounts))
      const chain = (balance.chainId && chains.find(({ id }) => id === balance.chainId)) || null
      const hasChain = balance.chainId && chainIds.has(balance.chainId)
      const hasEvmNetwork = balance.evmNetworkId && evmNetworkIds.has(balance.evmNetworkId)
      const chainUsesSecp256k1Accounts = chain?.account === "secp256k1"
      if (!isEthereumAddress(balance.address)) {
        if (!hasChain) return true
        if (chainUsesSecp256k1Accounts) return true
      }
      if (isEthereumAddress(balance.address)) {
        if (!hasEvmNetwork && !chainUsesSecp256k1Accounts) return true
      }

      // keep balance
      return false
    })
    if (abort.signal.aborted) return

    // create placeholder rows for all missing balances, so FE knows they are initializing
    const missingBalances: BalanceJson[] = []
    const existingBalances = await balancesDb.balances.toArray()
    const existingBalancesKeys = new Set(existingBalances.map((b) => `${b.tokenId}:${b.address}`))

    for (const balanceModule of balanceModules) {
      const addressesByToken = addressesByTokenByModule[balanceModule.type] ?? {}
      for (const [tokenId, addresses] of Object.entries(addressesByToken))
        for (const address of addresses) {
          if (!existingBalancesKeys.has(`${tokenId}:${address}`))
            missingBalances.push(balanceModule.getPlaceholderBalance(tokenId, address))
        }
    }

    if (missingBalances.length) {
      const updates = Object.entries(new Balances(missingBalances).toJSON()).map(
        ([id, balance]) => ({ id, ...balance })
      )
      await balancesDb.balances.bulkPut(updates)
    }
    if (abort.signal.aborted) return

    // after 30 seconds, change the status of all balances still initializing to stale
    setTimeout(() => {
      if (abort.signal.aborted) return

      balancesDb.balances
        .where({ status: "initializing" })
        .modify({ status: "stale" })
        .catch((error) => log.error("Failed to update balances", { error }))
    }, 30_000)

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
      const unsub = balancesFn(
        balanceModule,
        addressesByTokenByModule[balanceModule.type] ?? {},
        (error, balances) => {
          // log errors
          if (error) {
            if (
              error?.type === "STALE_RPC_ERROR" ||
              error?.type === "WEBSOCKET_ALLOCATION_EXHAUSTED_ERROR"
            ) {
              const addressesByModuleToken = addressesByTokenByModule[balanceModule.type] ?? {}
              return balancesDb.balances
                .where({ source: balanceModule.type, chainId: error.chainId })
                .filter((balance) => {
                  if (!Object.keys(addressesByModuleToken).includes(balance.tokenId)) return false
                  if (!addressesByModuleToken[balance.tokenId].includes(balance.address))
                    return false
                  return true
                })
                .modify({ status: "stale" })
            }

            return log.error(`Failed to fetch ${balanceModule.type} balances`, error)
          }

          // ignore empty balance responses
          if (!balances) return
          // ignore balances from old subscriptions which are still in the process of unsubscribing
          if (abort.signal.aborted) return

          updateBalances(balances)
        }
      )

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
